"""
Выполнение действий триггеров (отправка сообщений, медиа, модерация)
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import logging

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ChatPermissions
from aiogram.exceptions import TelegramAPIError

from backend.services.bot.shortcodes import ShortcodeProcessor

logger = logging.getLogger(__name__)


def build_keyboard(
    buttons_data: Optional[List[List[Dict[str, str]]]],
) -> Optional[InlineKeyboardMarkup]:
    """Построить клавиатуру из данных"""
    if not buttons_data or not isinstance(buttons_data, list):
        return None

    keyboard = []
    for row in buttons_data:
        if not isinstance(row, list):
            continue
        button_row = []
        for btn in row:
            if not isinstance(btn, dict):
                continue
            button_row.append(
                InlineKeyboardButton(
                    text=btn.get("text", ""),
                    url=btn.get("url"),
                    callback_data=btn.get("callback_data"),
                )
            )
        if button_row:
            keyboard.append(button_row)

    return InlineKeyboardMarkup(inline_keyboard=keyboard) if keyboard else None


def build_shortcode_context(user_id: int, action_data: dict, bot_info) -> dict:
    """Построить контекст для шорткодов"""
    ctx = action_data.get("context", {})
    if not isinstance(ctx, dict):
        ctx = {}
    
    return {
        "user": {
            "id": user_id,
            "first_name": ctx.get("first_name", ""),
            "username": ctx.get("username", ""),
        },
        "bot": {
            "first_name": bot_info.first_name if bot_info else "",
        }
    }


async def send_message(
    telegram_bot: Bot,
    chat_id: int,
    user_id: int,
    action_data: dict,
):
    """Отправить текстовое сообщение"""
    if not isinstance(action_data, dict):
        action_data = {}

    text = action_data.get("text", "")
    if not text:
        return

    bot_info = await telegram_bot.get_me()
    shortcode_context = build_shortcode_context(user_id, action_data, bot_info)
    text = ShortcodeProcessor.process(text, shortcode_context)

    reply_markup = build_keyboard(action_data.get("buttons"))

    try:
        await telegram_bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup,
        )
    except TelegramAPIError as e:
        logger.warning(f"Failed to send trigger message to {user_id}: {e}")


async def send_media(
    telegram_bot: Bot,
    chat_id: int,
    user_id: int,
    action_data: dict,
):
    """Отправить медиа"""
    if not isinstance(action_data, dict):
        action_data = {}

    media_url = action_data.get("media_url")
    media_type = action_data.get("media_type", "PHOTO")
    caption = action_data.get("text", "")

    if caption:
        bot_info = await telegram_bot.get_me()
        shortcode_context = build_shortcode_context(user_id, action_data, bot_info)
        caption = ShortcodeProcessor.process(caption, shortcode_context)

    reply_markup = build_keyboard(action_data.get("buttons"))

    if not media_url:
        return

    try:
        if media_type == "PHOTO":
            await telegram_bot.send_photo(
                chat_id=chat_id,
                photo=media_url,
                caption=caption,
                reply_markup=reply_markup,
            )
        elif media_type == "VIDEO":
            await telegram_bot.send_video(
                chat_id=chat_id,
                video=media_url,
                caption=caption,
                reply_markup=reply_markup,
            )
        elif media_type == "DOCUMENT":
            await telegram_bot.send_document(
                chat_id=chat_id,
                document=media_url,
                caption=caption,
                reply_markup=reply_markup,
            )
    except TelegramAPIError as e:
        logger.warning(f"Failed to send trigger media to {chat_id}: {e}")


async def mute_user(
    telegram_bot: Bot,
    chat_id: int,
    user_id: int,
    action_data: Dict[str, Any],
):
    """Заглушить пользователя"""
    if not isinstance(action_data, dict):
        action_data = {}

    duration_minutes = action_data.get("duration_minutes", 60)
    until_date = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)

    try:
        await telegram_bot.restrict_chat_member(
            chat_id=chat_id,
            user_id=user_id,
            permissions=ChatPermissions(can_send_messages=False),
            until_date=until_date,
        )
    except TelegramAPIError as e:
        logger.warning(f"Failed to mute user {user_id}: {e}")


async def ban_user(
    telegram_bot: Bot,
    chat_id: int,
    user_id: int,
    action_data: Dict[str, Any],
):
    """Забанить пользователя"""
    if not isinstance(action_data, dict):
        action_data = {}

    duration_minutes = action_data.get("duration_minutes", 0)

    try:
        if duration_minutes > 0:
            until_date = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
            await telegram_bot.ban_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                until_date=until_date,
            )
        else:
            await telegram_bot.ban_chat_member(
                chat_id=chat_id,
                user_id=user_id,
            )
    except TelegramAPIError as e:
        logger.warning(f"Failed to ban user {user_id}: {e}")
