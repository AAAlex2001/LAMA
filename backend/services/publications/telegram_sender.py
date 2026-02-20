"""Диспетчер отправки публикаций в Telegram."""

from typing import List, Optional
import logging

from aiogram.types import Message, InlineKeyboardMarkup
from aiogram.enums import ParseMode

from backend.models.publications import Publication, ContentType as DBContentType
from backend.models.channels import ChannelGroup as Channel
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard
from backend.services.publications.utils import (
    clean_html_for_telegram,
    prepare_inline_keyboard_data,
    validate_media_urls,
)
from backend.services.publications.single_media_sender import (
    send_image, send_video, send_audio, send_document,
)
from backend.services.publications.media_group_sender import send_text_with_media

logger = logging.getLogger(__name__)


async def send_to_telegram(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    reply_to_message_id: Optional[int] = None,
) -> List[Message]:
    """Отправить публикацию в Telegram канал."""
    validate_media_urls(publication)

    keyboard = None
    if publication.inline_keyboard:
        prepared_keyboard = prepare_inline_keyboard_data(publication)
        keyboard = build_keyboard(prepared_keyboard) if prepared_keyboard else None

    content_type = publication.content_type
    cleaned_text = clean_html_for_telegram(publication.text_content)
    messages: List[Message] = []

    if content_type == DBContentType.TEXT:
        if cleaned_text:
            messages = await send_text(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)
        elif not publication.poll_data:
            raise ValueError("Telegram message text is empty")

    elif content_type == DBContentType.TEXT_WITH_MEDIA:
        messages = await send_text_with_media(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.IMAGE:
        messages = await send_image(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.VIDEO:
        messages = await send_video(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.AUDIO:
        messages = await send_audio(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.DOCUMENT:
        messages = await send_document(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.LINK:
        if cleaned_text:
            messages = await send_link(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)
        elif not publication.poll_data:
            raise ValueError("Telegram message text is empty")

    elif content_type in [DBContentType.POLL, DBContentType.QUIZ]:
        messages = await send_poll(bot, channel, publication, keyboard, reply_to_message_id)

    else:
        raise ValueError(f"Unsupported content type: {content_type}")

    if publication.poll_data and content_type not in [DBContentType.POLL, DBContentType.QUIZ]:
        poll_messages = await send_poll(bot, channel, publication, keyboard=None)
        messages.extend(poll_messages)

    return messages


async def send_text(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить текстовое сообщение."""
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content),
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
    """Отправить ссылку с превью."""
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content),
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
    """Отправить опрос или викторину."""
    poll_data = publication.poll_data
    is_quiz = bool(poll_data.get("is_quiz")) or publication.content_type == DBContentType.QUIZ

    message = await bot.send_poll(
        chat_id=channel.telegram_id,
        question=poll_data["question"],
        options=poll_data["options"],
        is_anonymous=poll_data.get("is_anonymous", True),
        type="quiz" if is_quiz else "regular",
        allows_multiple_answers=poll_data.get("allows_multiple_answers", False),
        correct_option_id=poll_data.get("correct_option_id"),
        explanation=poll_data.get("explanation"),
        reply_markup=keyboard,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return [message]
