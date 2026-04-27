"""Диспетчер отправки публикации в Telegram по content_type."""

import logging
from typing import List, Optional

from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup, Message

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import ContentType as DBContentType, Publication
from backend.services.publications.features.publishing.send_media_group import send_text_with_media
from backend.services.publications.features.publishing.send_single_media import (
    send_audio,
    send_document,
    send_image,
    send_video,
)
from backend.services.publications.utils import (
    clean_html_for_telegram,
    prepare_inline_keyboard_data,
    validate_media_urls,
)
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


async def send_to_telegram(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    reply_to_message_id: Optional[int] = None,
) -> List[Message]:
    """Отправляет публикацию в один канал; для poll-данных шлёт отдельный poll-вторичкой."""
    validate_media_urls(publication)

    keyboard = build_publication_keyboard(publication)
    cleaned_text = clean_html_for_telegram(publication.text_content)
    content_type = publication.content_type

    messages = await dispatch_by_content_type(
        bot, channel, publication, keyboard, reply_to_message_id, cleaned_text,
    )

    if publication.poll_data and content_type not in (DBContentType.POLL, DBContentType.QUIZ):
        poll_messages = await send_poll(bot, channel, publication, keyboard=None)
        messages.extend(poll_messages)

    return messages


def build_publication_keyboard(publication: Publication) -> Optional[InlineKeyboardMarkup]:
    """InlineKeyboardMarkup из publication.inline_keyboard (или None)."""
    if not publication.inline_keyboard:
        return None
    prepared = prepare_inline_keyboard_data(publication)
    return build_keyboard(prepared) if prepared else None


async def dispatch_by_content_type(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int],
    cleaned_text: Optional[str],
) -> List[Message]:
    """Маршрутизация по content_type → конкретный sender."""
    content_type = publication.content_type
    args = (bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    if content_type == DBContentType.TEXT:
        if cleaned_text:
            return await send_text(*args)
        if not publication.poll_data:
            raise ValueError("Telegram message text is empty")
        return []

    if content_type == DBContentType.TEXT_WITH_MEDIA:
        return await send_text_with_media(*args)
    if content_type == DBContentType.IMAGE:
        return await send_image(*args)
    if content_type == DBContentType.VIDEO:
        return await send_video(*args)
    if content_type == DBContentType.AUDIO:
        return await send_audio(*args)
    if content_type == DBContentType.DOCUMENT:
        return await send_document(*args)

    if content_type == DBContentType.LINK:
        if cleaned_text:
            return await send_link(*args)
        if not publication.poll_data:
            raise ValueError("Telegram message text is empty")
        return []

    if content_type in (DBContentType.POLL, DBContentType.QUIZ):
        return await send_poll(bot, channel, publication, keyboard, reply_to_message_id)

    raise ValueError(f"Unsupported content type: {content_type}")


async def send_text(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Чистый текст."""
    text = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=text,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification,
        disable_web_page_preview=publication.disable_web_page_preview,
        reply_to_message_id=reply_to_message_id,
    )
    return [message]


async def send_link(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Текст со ссылкой; web-preview по флагу publication.disable_web_page_preview."""
    text = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=text,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_web_page_preview=publication.disable_web_page_preview,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return [message]


async def send_poll(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
) -> List[Message]:
    """Опрос или викторина (по флагу is_quiz или content_type)."""
    poll = publication.poll_data
    is_quiz = bool(poll.get("is_quiz")) or publication.content_type == DBContentType.QUIZ

    message = await bot.send_poll(
        chat_id=channel.telegram_id,
        question=poll["question"],
        options=poll["options"],
        is_anonymous=poll.get("is_anonymous", True),
        type="quiz" if is_quiz else "regular",
        allows_multiple_answers=poll.get("allows_multiple_answers", False),
        correct_option_id=poll.get("correct_option_id"),
        explanation=poll.get("explanation"),
        reply_markup=keyboard,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return [message]
