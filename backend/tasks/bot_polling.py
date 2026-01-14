"""
Обработка входящих сообщений ботов (polling)
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

from aiogram import Bot
from aiogram.types import (
    Update, Message, ChatJoinRequest, CallbackQuery,
    InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.exceptions import TelegramAPIError, TelegramRetryAfter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models.bots import (
    Bot as BotModel, BotStatus, MessageType, PendingApproval, ApprovalMode
)
from backend.services.bot import BotService, CaptchaService, BotCommandService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.shortcodes import ShortcodeProcessor
from backend.services.bot.moderation_triggers import ModerationTriggerService
from backend.utils import build_keyboard as utils_build_keyboard
from backend.services.channel.auto_delete import ChannelAutoDeleteService
from backend.services.channel.night_mode import ChannelNightModeService

logger = logging.getLogger(__name__)

# Константы
TELEGRAM_API_TIMEOUT = 5.0
MODERATION_COMMANDS = {"/admin", "/ban",
    "/unban", "/mute", "/unmute", "/delitetime"}


def get_master_bot() -> Bot:
    """Получить мастер-бота из env"""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set")
    return Bot(token=token)


@asynccontextmanager
async def bot_session(token: str):
    """Context manager для безопасной работы с Telegram Bot"""
    bot = Bot(token=token)
    try:
        yield bot
    finally:
        try:
            await asyncio.wait_for(bot.session.close(), timeout=1.0)
        except asyncio.TimeoutError:
            logger.warning("Bot session close timeout")
        except Exception as e:
            logger.debug(f"Bot session close: {e}")


# ============================================================================
# Polling - главная точка входа
# ============================================================================

async def process_bot_updates():
    """Обработка обновлений для всех активных ботов (polling)"""
    async with AsyncSessionLocal() as db:
        try:
            query = select(BotModel).where(
                BotModel.status == BotStatus.ACTIVE,
                BotModel.is_webhook_enabled == False
            )
            result = await db.execute(query)
            bots = list(result.scalars().all())

            for bot_model in bots:
                try:
                    await process_single_bot(db, bot_model)
                except TelegramRetryAfter as e:
                    logger.warning(
                        f"Rate limit {bot_model.username}: {e.retry_after}s")
                    await asyncio.sleep(e.retry_after)
                except Exception as e:
                    logger.error(f"Bot {bot_model.username} error: {e}")
                    bot_model.status = BotStatus.ERROR
                    await db.commit()

        except Exception as e:
            logger.error(f"process_bot_updates error: {e}")
            await db.rollback()


async def process_single_bot(db: AsyncSession, bot_model: BotModel):
    """Обработка обновлений одного бота"""
    async with bot_session(bot_model.token) as telegram_bot:
        updates: List[Update] = await telegram_bot.get_updates(
            offset=bot_model.last_update_id + 1,
            timeout=0,
            allowed_updates=["message", "edited_message",
                "chat_join_request", "callback_query"]
        )

        if not updates:
            return

        service = BotService(db)

        for update in updates:
            try:
                await route_update(db, service, bot_model, telegram_bot, update)
                bot_model.last_update_id = update.update_id
            except Exception as e:
                logger.error(f"Update {update.update_id} error: {e}")

        await db.commit()

        # Подтверждаем обработку
        await telegram_bot.get_updates(offset=bot_model.last_update_id + 1, timeout=0)


async def route_update(
    db: AsyncSession,
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    update: Update
):
    """Маршрутизация обновления"""
    if update.message:
        await handle_message(db, service, bot_model, telegram_bot, update.message)
    elif update.edited_message:
        await handle_message(db, service, bot_model, telegram_bot, update.edited_message)
    elif update.chat_join_request:
        await handle_join_request(service, bot_model, telegram_bot, update.chat_join_request)
    elif update.callback_query:
        await handle_callback_query(db, service, bot_model, telegram_bot, update.callback_query)


# ============================================================================
# Обработка сообщений
# ============================================================================

async def handle_message(
    db: AsyncSession,
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    message: Message
):
    """Обработка входящего сообщения"""
    # Определяем тип
    message_type, media_file_id = extract_media_info(message)
    text_content = message.text or message.caption
    chat_type = message.chat.type if message.chat else None

    # Сервисы
    auto_delete_service = ChannelAutoDeleteService(db)
    night_mode_service = ChannelNightModeService(db)

    # Проверка ночного режима
    is_media = message_type != MessageType.TEXT
    should_block, notice = await night_mode_service.should_block_message(
        message.chat.id, is_media=is_media
    )

    if should_block:
        await try_delete_message(telegram_bot, message)
        if notice:
            await try_send_message(telegram_bot, message.chat.id, notice)
        return

    # Сохраняем сообщение
    await service.save_message(
        bot_id=bot_model.id,
        telegram_message_id=message.message_id,
        chat_id=message.chat.id,
        user_id=message.from_user.id if message.from_user else None,
        message_type=message_type,
        text_content=text_content,
        media_file_id=media_file_id,
        media_url=None,
        is_incoming=True,
        raw_data=message.model_dump(mode='json')
    )

    # Удаляем системные сообщения
    if await auto_delete_service.delete_if_system_message(telegram_bot, message):
        return

    # Обработка команд и текста
    if text_content:
        await process_text_content(
            db, service, bot_model, telegram_bot, message,
            text_content, chat_type, auto_delete_service
        )


def extract_media_info(message: Message) -> tuple[MessageType, Optional[str]]:
    """Извлечь тип медиа и file_id из сообщения"""
    media_map = {
        "photo": (MessageType.PHOTO, lambda m: m.photo[-1].file_id if m.photo else None),
        "video": (MessageType.VIDEO, lambda m: m.video.file_id if m.video else None),
        "document": (MessageType.DOCUMENT, lambda m: m.document.file_id if m.document else None),
        "audio": (MessageType.AUDIO, lambda m: m.audio.file_id if m.audio else None),
        "voice": (MessageType.VOICE, lambda m: m.voice.file_id if m.voice else None),
        "sticker": (MessageType.STICKER, lambda m: m.sticker.file_id if m.sticker else None),
        "animation": (MessageType.ANIMATION, lambda m: m.animation.file_id if m.animation else None),
    }

    for attr, (msg_type, extractor) in media_map.items():
        if getattr(message, attr, None):
            return msg_type, extractor(message)

    return MessageType.TEXT, None


async def process_text_content(
    db: AsyncSession,
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    message: Message,
    text_content: str,
    chat_type: Optional[str],
    auto_delete_service: ChannelAutoDeleteService
):
    """Обработка текстового контента (команды и автоответы)"""
    # Команды
    if text_content.startswith("/"):
        command_text = text_content.split()[0].lower()

        # Модерационные команды
        if command_text in MODERATION_COMMANDS:
            moderation_service = ModerationTriggerService(db)
            if await moderation_service.handle_moderation_command(command_text, message, telegram_bot):
                await auto_delete_service.delete_if_command_message(telegram_bot, message)
                return

        # Пользовательские команды
        command_service = BotCommandService(db)
        command = await command_service.find_command_by_text(
            bot_model.id, command_text, chat_type=chat_type
        )

        if command:
            await send_command_response(telegram_bot, message, command, bot_model)

        await auto_delete_service.delete_if_command_message(telegram_bot, message)
        return

    # Автоответы
    auto_reply_service = AutoReplyService(db)
    auto_reply = await auto_reply_service.find_auto_reply_by_text(
        bot_model.id, text_content, chat_type=chat_type
    )

    if auto_reply:
        await send_auto_reply_response(telegram_bot, message, auto_reply, bot_model)


# ============================================================================
# Заявки на вступление
# ============================================================================

async def handle_join_request(
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    join_request: ChatJoinRequest
):
    """Обработка заявки на вступление"""
    user_id = join_request.from_user.id
    should_approve, missing_channels = await service.check_approval_criteria(bot_model, user_id)

    # MANUAL режим
    if bot_model.auto_approval_mode == ApprovalMode.MANUAL:
        await handle_manual_mode(service, bot_model, telegram_bot, join_request)

    # CRITERIA режим (не прошёл проверку)
    elif bot_model.auto_approval_mode == ApprovalMode.CRITERIA and not should_approve:
        if missing_channels:
            await send_subscription_requirements(telegram_bot, user_id, missing_channels)

    # Одобрение
    if should_approve:
        await approve_join_request(join_request.chat.id, user_id)


async def handle_manual_mode(
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    join_request: ChatJoinRequest
):
    """Обработка MANUAL режима"""
    # Капча
    if getattr(bot_model, "join_captcha_enabled", False):
        await send_captcha(service, bot_model, telegram_bot, join_request)


async def send_captcha(
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    join_request: ChatJoinRequest
):
    """Отправить капчу пользователю"""
    import random

    try:
        captcha_service = CaptchaService(service.db)
        question, answer = captcha_service.generate_captcha()

        pending = await captcha_service.create_pending_approval(
            bot_id=bot_model.id,
            user_id=join_request.from_user.id,
            chat_id=join_request.chat.id,
            captcha_question=question,
            captcha_answer=answer,
        )

        # Генерируем варианты
        correct = int(answer)
        options = {correct}
        while len(options) < 3:
            options.add(correct + random.randint(1, 4))

        options_list = list(options)
        random.shuffle(options_list)

        buttons = [[
            InlineKeyboardButton(
                text=str(opt), callback_data=f"captcha_{pending.id}_{opt}")
        ] for opt in options_list]

        await telegram_bot.send_message(
            chat_id=join_request.from_user.id,
            text=question,
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )
        logger.info(f"Captcha sent to {join_request.from_user.id}")

    except TelegramAPIError as e:
        logger.warning(f"Captcha send failed: {e}")


async def send_subscription_requirements(
    telegram_bot: Bot,
    user_id: int,
    missing_channels: List[int]
):
    """Отправить требования по подписке"""
    try:
        message_text = "📢 Для вступления подпишитесь на каналы:\n\n"
        buttons = []

        for idx, channel_id in enumerate(missing_channels, 1):
            try:
                chat = await telegram_bot.get_chat(channel_id)
                title = chat.title or f"Канал {idx}"

                if chat.username:
                    url = f"https://t.me/{chat.username}"
                    message_text += f"{idx}. {title}\n"
                    buttons.append(
                        [InlineKeyboardButton(text=f"📢 {title}", url=url)])
                else:
                    message_text += f"{idx}. {title} (приватный)\n"

            except TelegramAPIError:
                message_text += f"{idx}. Канал ID: {channel_id}\n"

        message_text += "\n✅ После подписки подайте заявку снова!"

        await telegram_bot.send_message(
            chat_id=user_id,
            text=message_text,
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=buttons) if buttons else None
        )

    except TelegramAPIError as e:
        logger.warning(f"Subscription requirements send failed: {e}")


async def approve_join_request(chat_id: int, user_id: int):
    """Одобрить заявку на вступление"""
    try:
        async with bot_session(os.getenv("TELEGRAM_BOT_TOKEN", "")) as master_bot:
            await master_bot.approve_chat_join_request(chat_id=chat_id, user_id=user_id)
            logger.info(
                f"Approved join request: user={user_id}, chat={chat_id}")
    except TelegramAPIError as e:
        logger.warning(f"Approve join request failed: {e}")


# ============================================================================
# Callback Query (капча)
# ============================================================================

async def handle_callback_query(
    db: AsyncSession,
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    callback_query: CallbackQuery
):
    """Обработка callback query"""
    data = callback_query.data

    if not data or not data.startswith("captcha_"):
        await telegram_bot.answer_callback_query(callback_query.id)
        return

    parts = data.split("_")
    if len(parts) < 3:
        return

    try:
        pending_id = int(parts[1])
        user_answer = parts[2]

        captcha_service = CaptchaService(db)
        is_correct = await captcha_service.check_captcha_answer(pending_id, user_answer)

        if is_correct:
            await process_correct_captcha(
                db, service, bot_model, telegram_bot, callback_query, pending_id
            )
        else:
            await telegram_bot.answer_callback_query(
                callback_query.id,
                text="❌ Неправильный ответ. Попробуйте ещё раз.",
                show_alert=True
            )

    except Exception as e:
        logger.error(f"Captcha callback error: {e}")
        await telegram_bot.answer_callback_query(
            callback_query.id,
            text="❌ Ошибка обработки.",
            show_alert=True
        )


async def process_correct_captcha(
    db: AsyncSession,
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    callback_query: CallbackQuery,
    pending_id: int
):
    """Обработка правильного ответа на капчу"""
    query = select(PendingApproval).where(PendingApproval.id == pending_id)
    result = await db.execute(query)
    pending = result.scalar_one_or_none()

    if not pending:
        return

    try:
        await approve_join_request(pending.chat_id, pending.user_id)

        await telegram_bot.answer_callback_query(
            callback_query.id,
            text="✅ Правильно! Заявка одобрена.",
            show_alert=True
        )

    except TelegramAPIError as e:
        logger.error(f"Approve after captcha failed: {e}")
        await telegram_bot.answer_callback_query(
            callback_query.id,
            text="❌ Ошибка одобрения заявки.",
            show_alert=True
        )


# ============================================================================
# Отправка ответов (команды, автоответы)
# ============================================================================

async def send_command_response(telegram_bot: Bot, message: Message, command, bot_model: BotModel):
    """Отправить ответ на команду"""
    context = build_shortcode_context(message, bot_model)
    text = ShortcodeProcessor.process(command.response_text, context)

    await send_response(
        telegram_bot,
        chat_id=message.chat.id,
        text=text,
        media_url=command.response_media_url,
        media_type=command.response_media_type,
        buttons=command.response_buttons,
    )


async def send_auto_reply_response(telegram_bot: Bot, message: Message, auto_reply, bot_model: BotModel):
    """Отправить автоответ"""
    context = build_shortcode_context(message, bot_model)
    text = ShortcodeProcessor.process(auto_reply.response_text, context)

    await send_response(
        telegram_bot,
        chat_id=message.chat.id,
        text=text,
        media_url=auto_reply.response_media_url,
        media_type=auto_reply.response_media_type,
        buttons=auto_reply.response_buttons,
    )


async def send_response(
    telegram_bot: Bot,
    chat_id: int,
    text: str,
    media_url: Optional[str] = None,
    media_type: Optional[MessageType] = None,
    buttons: Optional[Dict[str, Any]] = None,
) -> Optional[Message]:
    """Универсальная отправка ответа (текст/медиа + кнопки)"""
    reply_markup = build_keyboard(buttons)

    if media_url and media_type:
        send_methods = {
            MessageType.PHOTO: telegram_bot.send_photo,
            MessageType.VIDEO: telegram_bot.send_video,
            MessageType.DOCUMENT: telegram_bot.send_document,
        }

        method = send_methods.get(media_type)
        if method:
            media_param = {
                MessageType.PHOTO: "photo",
                MessageType.VIDEO: "video",
                MessageType.DOCUMENT: "document",
            }[media_type]

            return await method(
                chat_id=chat_id,
                **{media_param: media_url},
                caption=text,
                reply_markup=reply_markup
            )

    return await telegram_bot.send_message(
        chat_id=chat_id,
        text=text,
        reply_markup=reply_markup
    )


def build_shortcode_context(message: Message, bot_model: BotModel) -> Dict[str, Any]:
    """Построить контекст для шорткодов"""
    return {
        "user": {
            "id": message.from_user.id if message.from_user else None,
            "first_name": message.from_user.first_name if message.from_user else "",
            "username": message.from_user.username if message.from_user else None
        },
        "bot": {"first_name": bot_model.first_name}
    }


def build_keyboard(buttons_data: Optional[Dict[str, Any]]) -> Optional[InlineKeyboardMarkup]:
    """Построить inline keyboard (deprecated, use backend.utils.build_keyboard)"""
    return utils_build_keyboard(buttons_data)


# ============================================================================
# Утилиты
# ============================================================================

async def try_delete_message(telegram_bot: Bot, message: Message):
    """Попытаться удалить сообщение"""
    try:
        await asyncio.wait_for(
            telegram_bot.delete_message(
                chat_id=message.chat.id, message_id=message.message_id),
            timeout=TELEGRAM_API_TIMEOUT
        )
    except (TelegramAPIError, asyncio.TimeoutError):
        pass


async def try_send_message(telegram_bot: Bot, chat_id: int, text: str):
    """Попытаться отправить сообщение"""
    try:
        await asyncio.wait_for(
            telegram_bot.send_message(chat_id=chat_id, text=text),
            timeout=TELEGRAM_API_TIMEOUT
        )
    except (TelegramAPIError, asyncio.TimeoutError):
        pass
