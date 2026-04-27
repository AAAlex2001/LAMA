"""Отправка одиночного медиа (фото/видео/аудио/документ) с подписью."""

from typing import List, Optional

from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup, Message

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication
from backend.services.publications.features.publishing.warmup_media import (
    get_file_id_for_media,
    resolve_media,
)
from backend.services.publications.utils import clean_html_for_telegram, is_document_url
from backend.services.telegram_client import RateLimitedBot


def caption_or_clean(publication: Publication, cleaned_text: Optional[str]) -> Optional[str]:
    """Берёт уже очищенный caption или чистит из text_content."""
    if cleaned_text is not None:
        return cleaned_text
    return clean_html_for_telegram(publication.text_content)


async def send_image(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить фото; если URL ведёт на документ — отправить документом."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0, bot.bot.token)
    url = publication.media_urls[0]
    media = resolve_media(file_id, url)
    caption = caption_or_clean(publication, cleaned_text)

    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id, document=media, caption=caption,
            reply_markup=keyboard, parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_photo(
            chat_id=channel.telegram_id, photo=media, caption=caption,
            reply_markup=keyboard, parse_mode=ParseMode.HTML,
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
    """Отправить видео; URL-документ → документ."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0, bot.bot.token)
    url = publication.media_urls[0]
    media = resolve_media(file_id, url)
    caption = caption_or_clean(publication, cleaned_text)

    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id, document=media, caption=caption,
            reply_markup=keyboard, parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_video(
            chat_id=channel.telegram_id, video=media, caption=caption,
            reply_markup=keyboard, parse_mode=ParseMode.HTML,
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
    """Отправить аудио; URL-документ → документ."""
    file_id = get_file_id_for_media(publication.media_file_ids, 0, bot.bot.token)
    url = publication.media_urls[0]
    media = resolve_media(file_id, url)
    caption = caption_or_clean(publication, cleaned_text)

    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id, document=media, caption=caption,
            reply_markup=keyboard, parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_audio(
            chat_id=channel.telegram_id, audio=media, caption=caption,
            reply_markup=keyboard, parse_mode=ParseMode.HTML,
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
    file_id = get_file_id_for_media(publication.media_file_ids, 0, bot.bot.token)
    media = resolve_media(file_id, publication.media_urls[0])
    caption = caption_or_clean(publication, cleaned_text)

    message = await bot.send_document(
        chat_id=channel.telegram_id, document=media, caption=caption,
        reply_markup=keyboard, parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return [message]
