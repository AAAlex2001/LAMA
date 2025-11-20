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
from backend.services.bot.bots import BotService
from backend.models.channels import ActionType
from backend.models.bots import Bot as BotModel, PendingJoinApproval


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

            # Обработка команд в личке и в группах
            if update.message and update.message.chat and update.message.text:
                if update.message.text.startswith("/"):
                    command_text = update.message.text.split()[0]
                    command = await service.find_command_by_text(master_bot_model.id, command_text)
                    if command:
                        telegram_bot = get_master_bot()
                        try:
                            await send_command_response(telegram_bot, update.message.chat.id, command)
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


