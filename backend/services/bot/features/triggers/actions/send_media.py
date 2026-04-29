"""Trigger action: send media."""

import logging

from aiogram.exceptions import TelegramAPIError, TelegramRetryAfter
from aiogram.types import InputMediaDocument, InputMediaPhoto, InputMediaVideo
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import MessageType
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.bot.features.triggers.save_trigger_message import save_trigger_message
from backend.services.bot.features.triggers.shortcode_context import build_shortcode_ctx
from backend.services.bot_provider import get_bot_info
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard
from backend.utils.media import is_document_url, is_video_url

logger = logging.getLogger(__name__)

MEDIA_SEND_METHODS = {
    "PHOTO": "send_photo",
    "VIDEO": "send_video",
    "DOCUMENT": "send_document",
}


async def send_media_action(db: AsyncSession, bot: RateLimitedBot, chat_id: int, user_id: int, data: dict) -> bool:
    """Send single media item or album and persist outgoing DM messages."""
    media_urls = [url for url in (data.get("media_urls") or []) if url]
    media_url = data.get("media_url")
    if not media_urls and media_url:
        media_urls = [media_url]
    if not media_urls:
        return False
    caption = await render_caption(bot, user_id, data)
    try:
        if len(media_urls) > 1:
            return await send_media_group(db, bot, chat_id, data, media_urls, caption)
        return await send_single_media(db, bot, chat_id, data, media_urls[0], caption)
    except TelegramRetryAfter as exc:
        logger.warning("Trigger media rate limited for chat %s: %ss", chat_id, exc.retry_after)
    except TelegramAPIError as exc:
        logger.warning("Failed to send trigger media to %s: %s", chat_id, exc)
    return False


async def render_caption(bot: RateLimitedBot, user_id: int, data: dict) -> str:
    """Render optional caption through shortcode processor."""
    caption = data.get("text", "")
    if not caption:
        return ""
    bot_info = await get_bot_info(bot.bot.token)
    return ShortcodeProcessor.process(caption, build_shortcode_ctx(user_id, data, bot_info))


async def send_media_group(db: AsyncSession, bot: RateLimitedBot, chat_id: int, data: dict, media_urls: list[str], caption: str) -> bool:
    """Send Telegram media group and persist each result for DM chats."""
    media_group = [build_media_item(url, caption if index == 0 else None) for index, url in enumerate(media_urls[:10])]
    responses = await bot.send_media_group(chat_id=chat_id, media=media_group, _group_weight=0)
    for index, response in enumerate(responses or []):
        url = media_urls[index] if index < len(media_urls) else None
        await save_trigger_message(db, data, chat_id, response, fallback_message_type(url), url)
    return True


def build_media_item(url: str, caption: str | None):
    """Build InputMedia by URL type."""
    if is_video_url(url):
        return InputMediaVideo(media=url, caption=caption)
    if is_document_url(url):
        return InputMediaDocument(media=url, caption=caption)
    return InputMediaPhoto(media=url, caption=caption)


def fallback_message_type(url: str | None) -> MessageType:
    """Map media URL to fallback MessageType."""
    if url and is_video_url(url):
        return MessageType.VIDEO
    if url and is_document_url(url):
        return MessageType.DOCUMENT
    return MessageType.PHOTO


async def send_single_media(db: AsyncSession, bot: RateLimitedBot, chat_id: int, data: dict, media_url: str, caption: str) -> bool:
    """Send one media item and persist outgoing DM message."""
    media_type = data.get("media_type", "PHOTO")
    method_name = MEDIA_SEND_METHODS.get(media_type)
    if not method_name:
        return False
    method = getattr(bot, method_name)
    tg_message = await method(
        chat_id=chat_id,
        **{media_type.lower(): media_url},
        caption=caption,
        reply_markup=build_keyboard(data.get("buttons")),
        _group_weight=0,
    )
    await save_trigger_message(db, data, chat_id, tg_message, MessageType[media_type], media_url)
    return True