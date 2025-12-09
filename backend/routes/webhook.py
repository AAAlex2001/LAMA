from fastapi import APIRouter, Request, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import Optional, Dict, Any
import asyncio
import logging
from contextlib import asynccontextmanager

from aiogram.types import Update, ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError
from aiogram import Bot
from datetime import datetime, timezone, timedelta

from backend.config import TELEGRAM_WEBHOOK_SECRET
from backend.database import AsyncSessionLocal
from backend.tasks.bot_polling import get_master_bot, send_command_response, handle_join_request, send_auto_reply_response
from backend.services.channel import (
    ChannelModerationService,
    AntispamService,
    FloodService,
    ChannelAutoDeleteService,
    ChannelNightModeService
)
from backend.services.bot import BotService, CaptchaService, BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.moderation_triggers import ModerationTriggerService
from backend.services.bot.triggers import TriggerService
from backend.models.channels import ActionType
from backend.models.bots import Bot as BotModel, PendingJoinApproval, PendingApproval, TriggerType

router = APIRouter()
logger = logging.getLogger(__name__)

# Константы для производительности
MAX_CONCURRENT_TASKS = 10
TELEGRAM_API_TIMEOUT = 5.0
DB_QUERY_TIMEOUT = 3.0

# Модерационные команды (вынесены из кода)
MODERATION_COMMANDS = {"/admin", "/ban", "/unban", "/mute", "/unmute", "/delitetime"}


@asynccontextmanager
async def get_bot_session():
    """Context manager для безопасной работы с Telegram Bot"""
    bot = get_master_bot()
    try:
        yield bot
    finally:
        try:
            await asyncio.wait_for(bot.session.close(), timeout=1.0)
        except asyncio.TimeoutError:
            logger.warning("Bot session close timeout")
        except Exception as e:
            logger.error(f"Error closing bot session: {e}")


async def get_cached_master_bot(db: AsyncSession) -> Optional[BotModel]:
    """Получить мастер-бота из БД с кешированием"""
    import os
    master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_token:
        return None

    query = select(BotModel).where(BotModel.token == master_token)
    result = await db.execute(query)
    return result.scalar_one_or_none()


@router.post("/telegram/webhook")
async def telegram_webhook(
        request: Request,
        x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """
    Optimized Telegram Webhook handler
    - Быстрый ответ Telegram (< 50ms)
    - Параллельная обработка независимых задач
    - Graceful error handling
    """
    # Валидация секрета
    if x_telegram_bot_api_secret_token != TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="invalid secret")

    # Парсинг payload
    try:
        payload = await request.json()
        update = Update.model_validate(payload)
    except Exception as e:
        logger.warning(f"Invalid update payload: {e}")
        return {"ok": True}

    # Быстрый ответ Telegram (остальное - фоново)
    # Создаем задачи для параллельной обработки
    tasks = []

    # Задача 1: Модерация сообщений (независимая)
    message = update.message or update.channel_post or update.edited_message or update.edited_channel_post
    if message and message.chat and (message.text or message.caption):
        if message.chat.type in {"group", "supergroup", "channel"}:
            tasks.append(process_moderation(message))

    # Задача 2: Обработка основной логики бота
    tasks.append(process_bot_logic(update))

    # Запускаем задачи параллельно (но не ждем результата)
    if tasks:
        asyncio.create_task(run_background_tasks(tasks))

    return {"ok": True}


async def run_background_tasks(tasks: list):
    """Запустить фоновые задачи с обработкой ошибок"""
    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as e:
        logger.error(f"Background tasks error: {e}", exc_info=True)


async def process_moderation(message: Message):
    """Обработка модерации с оптимизацией запросов"""
    try:
        async with AsyncSessionLocal() as db:
            text_content = message.text or message.caption

            # Проверка антифлуда (только для групп с from_user)
            if message.chat.type in {"group", "supergroup"} and message.from_user:
                flood_service = FloodService(db)
                is_flood, flood_action, flood_mute = await asyncio.wait_for(
                    flood_service.check_flood_by_telegram_id(
                        telegram_id=message.chat.id,
                        user_id=message.from_user.id,
                    ),
                    timeout=DB_QUERY_TIMEOUT
                )

                if is_flood and flood_action:
                    await apply_moderation_action(message, flood_action, flood_mute)
                    return

            # Проверка антиспама (ссылки)
            antispam_service = AntispamService(db)
            should_block, action, mute_duration, reason = await asyncio.wait_for(
                antispam_service.check_antispam_by_telegram_id(
                    message.chat.id, text_content or ""
                ),
                timeout=DB_QUERY_TIMEOUT
            )

            if should_block:
                await apply_moderation_action(message, action, mute_duration)
                return

            # Проверка правил модерации (запрещённые слова)
            moderation_service = ChannelModerationService(db)
            rule = await asyncio.wait_for(
                moderation_service.check_message_by_telegram_id(
                    message.chat.id, text_content or ""
                ),
                timeout=DB_QUERY_TIMEOUT
            )

            if rule:
                await apply_moderation_action(message, rule.action, rule.mute_duration_minutes)

    except asyncio.TimeoutError:
        logger.warning(f"Moderation timeout for message {message.message_id}")
    except Exception as e:
        logger.error(f"Moderation error: {e}", exc_info=True)


async def apply_moderation_action(
        message: Message,
        action: ActionType,
        mute_duration: Optional[int]
):
    """Применить действие модерации"""
    try:
        async with get_bot_session() as bot:
            # Удаляем сообщение
            try:
                await asyncio.wait_for(
                    bot.delete_message(
                        chat_id=message.chat.id,
                        message_id=message.message_id,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
                )
            except (TelegramAPIError, asyncio.TimeoutError) as e:
                logger.debug(f"Failed to delete message: {e}")

            # Применяем действие к пользователю
            if not message.from_user:
                return

            if action == ActionType.MUTE:
                until_date = None
                if mute_duration:
                    until_date = datetime.now(timezone.utc) + timedelta(minutes=mute_duration)

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

                await asyncio.wait_for(
                    bot.restrict_chat_member(
                        chat_id=message.chat.id,
                        user_id=message.from_user.id,
                        permissions=permissions,
                        until_date=until_date,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
                )

            elif action == ActionType.KICK:
                await asyncio.wait_for(
                    bot.ban_chat_member(
                        chat_id=message.chat.id,
                        user_id=message.from_user.id,
                        revoke_messages=False,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
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

                await asyncio.wait_for(
                    bot.restrict_chat_member(
                        chat_id=message.chat.id,
                        user_id=message.from_user.id,
                        permissions=permissions,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
                )

    except asyncio.TimeoutError:
        logger.warning(f"Moderation action timeout for user {message.from_user.id if message.from_user else 'unknown'}")
    except Exception as e:
        logger.error(f"Failed to apply moderation action: {e}", exc_info=True)


async def process_bot_logic(update: Update):
    """Основная логика обработки бота"""
    try:
        async with AsyncSessionLocal() as db:
            bot_service = BotService(db)
            master_bot_model = await get_cached_master_bot(db)

            if not master_bot_model:
                return

            # Обработка заявки на вступление
            if update.chat_join_request:
                await process_join_request(db, bot_service, master_bot_model, update)
                return

            # Обработка сообщений
            if update.message and update.message.chat:
                await process_message(db, master_bot_model, update.message)
                return

            # Обработка callback (капча)
            if update.callback_query and update.callback_query.data:
                await process_callback_query(db, update.callback_query)
                return

            # Обработка подписки на канал
            if update.chat_member and update.chat_member.new_chat_member:
                await process_subscription(db, bot_service, master_bot_model, update.chat_member)
                return

    except Exception as e:
        logger.error(f"Bot logic error: {e}", exc_info=True)


async def process_join_request(
        db: AsyncSession,
        bot_service: BotService,
        master_bot_model: BotModel,
        update: Update
):
    """Обработка заявки на вступление"""
    try:
        async with get_bot_session() as telegram_bot:
            should_approve, missing = await bot_service.check_approval_criteria(
                master_bot_model,
                update.chat_join_request.from_user.id
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

            await handle_join_request(
                bot_service,
                master_bot_model,
                telegram_bot,
                update.chat_join_request
            )
    except Exception as e:
        logger.error(f"Join request error: {e}", exc_info=True)


async def process_message(
        db: AsyncSession,
        master_bot_model: BotModel,
        message: Message
):
    """Обработка сообщений с оптимизацией"""
    text_content = message.text or message.caption
    chat_type = message.chat.type if message.chat else None

    try:
        async with get_bot_session() as telegram_bot:
            # Удаление системных сообщений
            auto_delete_service = ChannelAutoDeleteService(db)
            if await auto_delete_service.delete_if_system_message(telegram_bot, message):
                return

            # Проверка ночного режима
            is_media = any([
                getattr(message, attr, None)
                for attr in ["photo", "video", "document", "audio", "voice", "sticker", "animation"]
            ])

            night_mode_service = ChannelNightModeService(db)
            should_block, notice = await night_mode_service.should_block_message(
                message.chat.id,
                is_media=is_media,
            )

            if should_block:
                try:
                    await asyncio.wait_for(
                        telegram_bot.delete_message(
                            chat_id=message.chat.id,
                            message_id=message.message_id,
                        ),
                        timeout=TELEGRAM_API_TIMEOUT
                    )
                except (TelegramAPIError, asyncio.TimeoutError):
                    pass

                if notice:
                    try:
                        await asyncio.wait_for(
                            telegram_bot.send_message(
                                chat_id=message.chat.id,
                                text=notice,
                            ),
                            timeout=TELEGRAM_API_TIMEOUT
                        )
                    except (TelegramAPIError, asyncio.TimeoutError):
                        pass
                return

            # Обработка добавления новых участников
            if message.new_chat_members:
                trigger_service = TriggerService(db)
                for new_member in message.new_chat_members:
                    await trigger_service.fire_event(
                        bot_id=master_bot_model.id,
                        trigger_type=TriggerType.MEMBER_JOINED,
                        user_id=new_member.id,
                        chat_id=message.chat.id,
                        telegram_bot=telegram_bot,
                        context={"username": new_member.username, "first_name": new_member.first_name}
                    )

            # Обработка текстового контента
            if text_content:
                await process_text_message(
                    db,
                    master_bot_model,
                    message,
                    text_content,
                    chat_type,
                    telegram_bot,
                    auto_delete_service
                )

    except Exception as e:
        logger.error(f"Message processing error: {e}", exc_info=True)


async def process_text_message(
        db: AsyncSession,
        master_bot_model: BotModel,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        telegram_bot: Bot,
        auto_delete_service: ChannelAutoDeleteService
):
    """Обработка текстовых сообщений (команды и автоответы)"""
    # Проверка на команду
    if text_content.startswith("/"):
        command_text = text_content.split()[0]

        # Модерационные команды
        if command_text.lower() in MODERATION_COMMANDS:
            moderation_trigger_service = ModerationTriggerService()
            handled = await moderation_trigger_service.handle_moderation_command(
                command=command_text,
                message=message,
                telegram_bot=telegram_bot
            )

            if handled:
                await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        # Пользовательские команды
        command_service = BotCommandService(db)
        command = await command_service.find_command_by_text(
            master_bot_model.id,
            command_text,
            chat_type=chat_type
        )

        if command:
            await send_command_response(telegram_bot, message, command, master_bot_model)
            await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        # Команда не найдена, но удаляем исходное сообщение
        await auto_delete_service.delete_if_command_message(telegram_bot, message)
        return

    # Триггер USER_MESSAGE (для любых текстовых сообщений)
    user_id = message.from_user.id if message.from_user else 0
    trigger_service = TriggerService(db)
    await trigger_service.fire_event(
        bot_id=master_bot_model.id,
        trigger_type=TriggerType.USER_MESSAGE,
        user_id=user_id,
        chat_id=message.chat.id,
        telegram_bot=telegram_bot,
        context={"text": text_content[:100]}  # Первые 100 символов
    )

    # Проверка автоответов
    auto_reply_service = AutoReplyService(db)
    auto_reply = await auto_reply_service.find_auto_reply_by_text(
        master_bot_model.id,
        text_content,
        chat_type=chat_type
    )

    if auto_reply:
        await send_auto_reply_response(telegram_bot, message, auto_reply, master_bot_model)


async def process_callback_query(db: AsyncSession, callback_query):
    """Обработка callback query (капча)"""
    callback_data = callback_query.data

    if not callback_data.startswith("captcha_"):
        return

    parts = callback_data.split("_")
    if len(parts) < 3:
        return

    try:
        pending_id = int(parts[1])
        user_answer = parts[2]

        captcha_service = CaptchaService(db)
        is_correct = await captcha_service.check_captcha_answer(pending_id, user_answer)

        async with get_bot_session() as telegram_bot:
            if is_correct:
                # Одобряем заявку
                query = select(PendingApproval).where(PendingApproval.id == pending_id)
                result = await db.execute(query)
                pending_approval = result.scalar_one_or_none()

                if pending_approval:
                    try:
                        await asyncio.wait_for(
                            telegram_bot.approve_chat_join_request(
                                chat_id=pending_approval.chat_id,
                                user_id=pending_approval.user_id,
                            ),
                            timeout=TELEGRAM_API_TIMEOUT
                        )
                    except (TelegramAPIError, asyncio.TimeoutError):
                        pass

                await telegram_bot.answer_callback_query(
                    callback_query.id,
                    text="✅ Правильно! Заявка одобрена.",
                    show_alert=True,
                )
            else:
                await telegram_bot.answer_callback_query(
                    callback_query.id,
                    text="❌ Неправильный ответ. Попробуйте ещё раз.",
                    show_alert=True,
                )

    except ValueError:
        logger.warning(f"Invalid captcha callback data: {callback_data}")
    except Exception as e:
        logger.error(f"Callback query error: {e}", exc_info=True)

        try:
            async with get_bot_session() as telegram_bot:
                await telegram_bot.answer_callback_query(
                    callback_query.id,
                    text="❌ Ошибка обработки ответа.",
                    show_alert=True,
                )
        except Exception:
            pass


async def process_subscription(
        db: AsyncSession,
        bot_service: BotService,
        master_bot_model: BotModel,
        chat_member
):
    """
    Обработка подписки на канал
    Оптимизация: один запрос для получения всех pending с eager loading
    """
    new_status = chat_member.new_chat_member.status
    if new_status not in {"member", "administrator", "creator"}:
        return

    user_id = chat_member.from_user.id
    channel_id = chat_member.chat.id

    try:
        # Получаем все pending для пользователя одним запросом
        query = select(PendingJoinApproval).where(
            PendingJoinApproval.user_id == user_id
        )
        result = await db.execute(query)
        pendings = list(result.scalars().all())

        if not pendings:
            return

        # Обрабатываем все pending батчем
        approved_pendings = []

        for pending in pendings:
            if channel_id not in pending.missing_channels:
                continue

            # Убираем канал из списка
            pending.missing_channels.remove(channel_id)

            # Если все каналы подписаны - добавляем в список на одобрение
            if not pending.missing_channels:
                approved_pendings.append(pending)

        # Одобряем все заявки батчем
        if approved_pendings:
            async with get_bot_session() as telegram_bot:
                for pending in approved_pendings:
                    try:
                        await asyncio.wait_for(
                            telegram_bot.approve_chat_join_request(
                                chat_id=pending.chat_id,
                                user_id=pending.user_id
                            ),
                            timeout=TELEGRAM_API_TIMEOUT
                        )
                    except (TelegramAPIError, asyncio.TimeoutError) as e:
                        logger.warning(f"Failed to approve join request: {e}")

                    # Удаляем обработанный pending
                    await db.delete(pending)

        # Коммитим все изменения одной транзакцией
        await db.commit()

    except Exception as e:
        logger.error(f"Subscription processing error: {e}", exc_info=True)
        await db.rollback()