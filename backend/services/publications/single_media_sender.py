"""Отправка одиночных медиа в Telegram (фото, видео, аудио, документ)."""

from typing import List, Optional
import logging

from aiogram.types import Message, InlineKeyboardMarkup
from aiogram.enums import ParseMode

from backend.models.publications import Publication
from backend.models.channels import ChannelGroup as Channel
from backend.services.telegram_client import RateLimitedBot
from backend.services.publications.media_warmup import get_file_id_for_media
from backend.services.publications.utils import clean_html_for_telegram, is_document_url

logger = logging.getLogger(__name__)


async def send_image(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить фото."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    url = publication.media_urls[0]

    cleaned_caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id,
            document=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_photo(
            chat_id=channel.telegram_id,
            photo=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            has_spoiler=publication.media_blur,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    return [message]


async def send_video(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить видео."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    url = publication.media_urls[0]
    cleaned_caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)

    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id,
            document=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_video(
            chat_id=channel.telegram_id,
            video=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            has_spoiler=publication.media_blur,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    return [message]


async def send_audio(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить аудио."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    url = publication.media_urls[0]
    cleaned_caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)

    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id,
            document=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_audio(
            chat_id=channel.telegram_id,
            audio=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    return [message]


async def send_document(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить документ."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]

    message = await bot.send_document(
        chat_id=channel.telegram_id,
        document=media_to_send,
        caption=cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content),
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return [message]
