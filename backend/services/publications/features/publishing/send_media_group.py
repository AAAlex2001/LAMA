"""Отправка медиа-групп (альбомов) и одиночных медиа с текстом."""

import logging
from typing import List, Optional

from aiogram.enums import ParseMode
from aiogram.types import (
    InlineKeyboardMarkup,
    InputMediaAudio,
    InputMediaDocument,
    InputMediaPhoto,
    InputMediaVideo,
    Message,
)

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication
from backend.services.publications.features.publishing.warmup_media import (
    get_file_id_for_media,
    resolve_media,
)
from backend.services.publications.utils import (
    clean_html_for_telegram,
    get_spoiler,
    is_audio_url,
    is_document_url,
    is_video_url,
)
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


async def send_text_with_media(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Шлёт одиночное медиа с подписью или альбом; если медиа нет — просто текст."""
    if not publication.media_urls:
        from backend.services.publications.features.publishing.send_to_telegram import send_text
        return await send_text(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)

    if len(publication.media_urls) == 1:
        return await send_single_media_with_text(
            bot, channel, publication, keyboard, reply_to_message_id, caption,
        )
    return await send_media_group(bot, channel, publication, reply_to_message_id, caption)


async def send_single_media_with_text(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int],
    caption: Optional[str],
) -> List[Message]:
    """Одно медиа с подписью: фото/видео/документ по типу URL."""
    blur_list = publication.media_blur or []
    url = publication.media_urls[0]
    file_id = get_file_id_for_media(publication.media_file_ids, 0, bot.bot.token)
    media = resolve_media(file_id, url)
    spoiler = get_spoiler(blur_list, 0)

    common = dict(
        chat_id=channel.telegram_id,
        caption=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )

    if is_document_url(url):
        message = await bot.send_document(document=media, **common)
    elif is_video_url(url):
        message = await bot.send_video(video=media, has_spoiler=spoiler, **common)
    else:
        message = await bot.send_photo(photo=media, has_spoiler=spoiler, **common)
    return [message]


async def send_media_group(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    reply_to_message_id: Optional[int],
    caption: Optional[str],
) -> List[Message]:
    """Альбом до 10 медиа; caption только на первом элементе."""
    blur_list = publication.media_blur or []
    urls = publication.media_urls[:10]

    media: list = []
    for i, url in enumerate(urls):
        file_id = get_file_id_for_media(publication.media_file_ids, i, bot.bot.token)
        media_to_send = resolve_media(file_id, url)
        spoiler = get_spoiler(blur_list, i)
        item_caption = caption if i == 0 and caption else None
        media.append(build_media_item(url, media_to_send, item_caption, spoiler))

    messages = await bot.send_media_group(
        chat_id=channel.telegram_id, media=media,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return list(messages)


def build_media_item(url: str, media_to_send, caption: Optional[str], spoiler: bool):
    """InputMedia* нужного типа по URL (Document/Audio/Video/Photo)."""
    parse_mode = ParseMode.HTML if caption else None

    if is_document_url(url):
        return InputMediaDocument(media=media_to_send, caption=caption, parse_mode=parse_mode)
    if is_audio_url(url):
        return InputMediaAudio(media=media_to_send, caption=caption, parse_mode=parse_mode)
    if is_video_url(url):
        return InputMediaVideo(media=media_to_send, caption=caption, parse_mode=parse_mode, has_spoiler=spoiler)
    return InputMediaPhoto(media=media_to_send, caption=caption, parse_mode=parse_mode, has_spoiler=spoiler)
