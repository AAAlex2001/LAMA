from fastapi import APIRouter, Request, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Optional

from aiogram.types import Update, ChatPermissions
from aiogram.exceptions import TelegramAPIError
from datetime import datetime, timezone, timedelta

from backend.config import TELEGRAM_WEBHOOK_SECRET
from backend.database import AsyncSessionLocal
from backend.tasks.bot_polling import get_master_bot, send_command_response, handle_join_request
from backend.services.channel import ChannelModerationService, AntispamService, FloodService
from backend.services.bot import BotService, CaptchaService, BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.moderation_triggers import ModerationTriggerService
from backend.models.channels import ActionType
from backend.models.bots import Bot as BotModel, PendingJoinApproval, PendingApproval


router = APIRouter()


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """
    Универсальный обработчик Telegram Webhook.
    - Валидирует секретный заголовок
    - Возвращает 200 OK сразу (Telegram ожидает быстрый ответ)
    - Параллельно выполняет базовую модерацию для сообщений в группах
    """
    if x_telegram_bot_api_secret_token != TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="invalid secret")

    payload = await request.json()

    # Быстрый ответ Telegram
    # (дальнейшая обработка без блокирования ответа)
    try:
        update = Update.model_validate(payload)
    except Exception:
        return {"ok": True}

    # Простая модерация сообщений (без привязки к конкретному user-боту)
    try:
        # Обрабатываем обычные сообщения и сообщения из каналов
        message = update.message or update.channel_post or update.edited_message or update.edited_channel_post
        if message and message.chat:
            text_content = message.text or message.caption
            if text_content:
                # Проверяем для групп, супергрупп и каналов
                if message.chat.type in {"group", "supergroup", "channel"}:
                    async with AsyncSessionLocal() as db:
                        await apply_moderation_if_needed(db, update, message)
    except Exception:
        # Не ломаем webhook из-за ошибок фоновой обработки
        pass

    # Приветствия/команды для мастер-бота
    try:
        async with AsyncSessionLocal() as db:
            service = BotService(db)
            master_bot_model = await get_master_bot_model(db)
            if not master_bot_model:
                return {"ok": True}

            # Обработка заявки на вступление (приветствие/критерии)
            if update.chat_join_request:
                telegram_bot = get_master_bot()
                try:
                    should_approve, missing = await service.check_approval_criteria(
                        master_bot_model, update.chat_join_request.from_user.id
                    )
                    if not should_approve and missing:
                        # Сохраняем ожидание
                        pending = PendingJoinApproval(
                            bot_id=master_bot_model.id,
                            user_id=update.chat_join_request.from_user.id,
                            chat_id=update.chat_join_request.chat.id,
                            missing_channels=missing,
                        )
                        db.add(pending)
                        await db.commit()
                    await handle_join_request(service, master_bot_model, telegram_bot, update.chat_join_request)
                finally:
                    await telegram_bot.session.close()

            # Обработка команд и автоответов в личке и в группах
            if update.message and update.message.chat:
                message = update.message
                text_content = message.text or message.caption
                chat_type = message.chat.type if message.chat else None
                
                if text_content:
                    # Инициализируем сервисы
                    command_service = BotCommandService(db)
                    auto_reply_service = AutoReplyService(db)
                    moderation_trigger_service = ModerationTriggerService()
                    
                    telegram_bot = get_master_bot()
                    try:
                        # Проверяем, является ли это командой
                        if text_content.startswith("/"):
                            command_text = text_content.split()[0]
                            
                            # Сначала проверяем модерационные команды
                            moderation_commands = ["/admin", "/ban", "/unban", "/mute", "/unmute", "/delitetime"]
                            if command_text.lower() in moderation_commands:
                                handled = await moderation_trigger_service.handle_moderation_command(
                                    command_text,
                                    message,
                                    telegram_bot
                                )
                                if handled:
                                    await telegram_bot.session.close()
                                    return {"ok": True}
                            
                            # Затем ищем пользовательские команды
                            command = await command_service.find_command_by_text(
                                master_bot_model.id,
                                command_text,
                                chat_type=chat_type
                            )
                            
                            if command:
                                await send_command_response(telegram_bot, message, command, master_bot_model)
                                await telegram_bot.session.close()
                                return {"ok": True}
                        
                        # Если не команда, проверяем автоответы на ключевые слова
                        auto_reply = await auto_reply_service.find_auto_reply_by_text(
                            master_bot_model.id,
                            text_content,
                            chat_type=chat_type
                        )
                        
                        if auto_reply:
                            from backend.tasks.bot_polling import send_auto_reply_response
                            await send_auto_reply_response(telegram_bot, message, auto_reply, master_bot_model)
                    finally:
                        await telegram_bot.session.close()

            # Обработка callback_query (в том числе ответы на капчу)
            if update.callback_query and update.callback_query.data:
                callback = update.callback_query
                callback_data = callback.data

                # Ответ на капчу: формат captcha_{pending_id}_{answer}
                if callback_data.startswith("captcha_"):
                    parts = callback_data.split("_")
                    if len(parts) >= 3:
                        try:
                            pending_id = int(parts[1])
                            user_answer = parts[2]

                            captcha_service = CaptchaService(db)
                            is_correct = await captcha_service.check_captcha_answer(pending_id, user_answer)

                            telegram_bot = get_master_bot()
                            try:
                                if is_correct:
                                    # Находим pending_approval, чтобы одобрить заявку
                                    query = select(PendingApproval).where(PendingApproval.id == pending_id)
                                    result = await db.execute(query)
                                    pending_approval = result.scalar_one_or_none()

                                    if pending_approval:
                                        try:
                                            await telegram_bot.approve_chat_join_request(
                                                chat_id=pending_approval.chat_id,
                                                user_id=pending_approval.user_id,
                                            )
                                        except TelegramAPIError:
                                            pass

                                    await telegram_bot.answer_callback_query(
                                        callback.id,
                                        text="✅ Правильно! Заявка одобрена.",
                                        show_alert=True,
                                    )
                                else:
                                    await telegram_bot.answer_callback_query(
                                        callback.id,
                                        text="❌ Неправильный ответ. Попробуйте ещё раз.",
                                        show_alert=True,
                                    )
                            finally:
                                await telegram_bot.session.close()
                        except Exception:
                            # В случае ошибки просто отвечаем callback, чтобы не висело
                            telegram_bot = get_master_bot()
                            try:
                                await telegram_bot.answer_callback_query(
                                    callback.id,
                                    text="❌ Ошибка обработки ответа.",
                                    show_alert=True,
                                )
                            finally:
                                await telegram_bot.session.close()

            # Обработка chat_member (подписка на канал)
            if update.chat_member and update.chat_member.new_chat_member:
                new_status = update.chat_member.new_chat_member.status
                if new_status in {"member", "administrator", "creator"}:
                    await handle_subscription(db, service, master_bot_model, update.chat_member)
    except Exception:
        pass

    return {"ok": True}


async def apply_moderation_if_needed(db: AsyncSession, update: Update, message):
    text_content = message.text or message.caption
    
    # Антифлуд (для групп/супергрупп, только если есть from_user)
    if message.chat.type in {"group", "supergroup"} and message.from_user:
        flood_service = FloodService(db)
        is_flood, flood_action, flood_mute = await flood_service.check_flood_by_telegram_id(
            telegram_id=message.chat.id,
            user_id=message.from_user.id,
        )
        if is_flood and flood_action:
            await apply_moderation_action(message, flood_action, flood_mute)
            return

    # Проверка антиспама (ссылки)
    antispam_service = AntispamService(db)
    should_block, action, mute_duration, reason = await antispam_service.check_antispam_by_telegram_id(
        message.chat.id, text_content or ""
    )
    
    if should_block:
        await apply_moderation_action(message, action, mute_duration)
        return
    
    # Проверка правил модерации (запрещённые слова)
    moderation_service = ChannelModerationService(db)
    rule = await moderation_service.check_message_by_telegram_id(
        message.chat.id, text_content or ""
    )
    if not rule:
        return
    
    await apply_moderation_action(message, rule.action, rule.mute_duration_minutes)


async def apply_moderation_action(message, action: ActionType, mute_duration: Optional[int]):
    """Применить действие модерации: удалить сообщение и выполнить действие"""

    moderation_bot = get_master_bot()
    try:
        # Удаляем сообщение
        try:
            await moderation_bot.delete_message(
                chat_id=message.chat.id,
                message_id=message.message_id,
            )
        except TelegramAPIError:
            pass

        # Применяем действие к пользователю (только если есть from_user)
        if message.from_user and action in {ActionType.MUTE, ActionType.KICK, ActionType.UNMUTE}:
            if action == ActionType.MUTE:
                until_date = None
                if mute_duration:
                    until_date = datetime.now(timezone.utc) + timedelta(
                        minutes=mute_duration
                    )
                permissions = ChatPermissions(
                    can_send_messages=False,
                    can_send_media_messages=False,
                    can_send_polls=False,
                    can_send_other_messages=False,
                    can_add_web_page_previews=False,
                    can_pin_messages=False,
                    can_change_info=False,
                    can_invite_users=False,
                )
                await moderation_bot.restrict_chat_member(
                    chat_id=message.chat.id,
                    user_id=message.from_user.id,
                    permissions=permissions,
                    until_date=until_date,
                )
            elif action == ActionType.KICK:
                await moderation_bot.ban_chat_member(
                    chat_id=message.chat.id,
                    user_id=message.from_user.id,
                    revoke_messages=False,
                )
            elif action == ActionType.UNMUTE:
                permissions = ChatPermissions(
                    can_send_messages=True,
                    can_send_media_messages=True,
                    can_send_polls=True,
                    can_send_other_messages=True,
                    can_add_web_page_previews=True,
                    can_pin_messages=False,
                    can_change_info=False,
                    can_invite_users=True,
                )
                await moderation_bot.restrict_chat_member(
                    chat_id=message.chat.id,
                    user_id=message.from_user.id,
                    permissions=permissions,
                )
    finally:
        await moderation_bot.session.close()


async def get_master_bot_model(db: AsyncSession) -> Optional[BotModel]:
    """
    Получить запись мастер-бота из БД:
    - используется для хранения настроек приветствия и команд мастер-бота
    """
    import os

    master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_token:
        return None

    query = select(BotModel).where(BotModel.token == master_token)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def handle_subscription(db: AsyncSession, service: BotService, bot: BotModel, chat_member):
    """Обработка подписки пользователя на канал: проверка ожиданий и автоодобрение"""
    user_id = chat_member.from_user.id
    channel_id = chat_member.chat.id

    # Найти все ожидающие заявки для этого пользователя
    query = select(PendingJoinApproval).where(PendingJoinApproval.user_id == user_id)
    result = await db.execute(query)
    pendings = result.scalars().all()
    if not pendings:
        return

    for pending in pendings:
        if channel_id not in pending.missing_channels:
            continue
        # Убираем канал из списка недостающих
        pending.missing_channels.remove(channel_id)
        if not pending.missing_channels:
            # Все каналы подписаны — одобряем заявку
            telegram_bot = get_master_bot()
            try:
                await telegram_bot.approve_chat_join_request(
                    chat_id=pending.chat_id, user_id=pending.user_id
                )
            except TelegramAPIError:
                pass
            finally:
                await telegram_bot.session.close()
            # Удаляем ожидание
            await db.delete(pending)
        await db.commit()


