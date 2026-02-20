"""Отправка медиа-групп и одиночных медиа с текстом в Telegram."""

from typing import List, Optional
import logging

from aiogram.types import (
    Message, InputMediaPhoto, InputMediaVideo,
    InputMediaDocument, InputMediaAudio, InlineKeyboardMarkup,
)
from aiogram.enums import ParseMode

from backend.models.publications import Publication
from backend.models.channels import ChannelGroup as Channel
from backend.services.telegram_client import RateLimitedBot
from backend.services.publications.media_warmup import get_file_id_for_media
from backend.services.publications.utils import (
    clean_html_for_telegram,
    get_spoiler,
    is_audio_url,
    is_document_url,
    is_video_url,
)

logger = logging.getLogger(__name__)


async def send_text_with_media(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить текст с медиа (одиночное или группа)."""
    if not publication.media_urls:
        from backend.services.publications.telegram_sender import send_text
        return await send_text(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    caption_text = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)

    if len(publication.media_urls) == 1:
        return await send_single_media_with_text(
            bot, channel, publication, keyboard, reply_to_message_id, caption_text,
        )

    return await send_media_group(
        bot, channel, publication, reply_to_message_id, caption_text,
    )


async def send_single_media_with_text(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int],
    caption_text: Optional[str],
) -> List[Message]:
    """Отправить одиночное медиа с подписью."""
    blur_list = publication.media_blur or []
    single_url = publication.media_urls[0]
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else single_url
    spoiler = get_spoiler(blur_list, 0)

    logger.info(
        f"Single media: url={single_url[:80]}, "
        f"file_id={'Yes' if file_id else 'No'}, is_video={is_video_url(single_url)}"
    )

    if is_document_url(single_url):
        message = await bot.send_document(
            chat_id=channel.telegram_id, document=media_to_send,
            caption=caption_text, reply_markup=keyboard, parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    elif is_video_url(single_url):
        message = await bot.send_video(
            chat_id=channel.telegram_id, video=media_to_send,
            caption=caption_text, reply_markup=keyboard, parse_mode=ParseMode.HTML,
            has_spoiler=spoiler, disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    else:
        message = await bot.send_photo(
            chat_id=channel.telegram_id, photo=media_to_send,
            caption=caption_text, reply_markup=keyboard, parse_mode=ParseMode.HTML,
            has_spoiler=spoiler, disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id,
        )
    return [message]


async def send_media_group(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    reply_to_message_id: Optional[int],
    caption_text: Optional[str],
) -> List[Message]:
    """Отправить медиа-группу (альбом)."""
    blur_list = publication.media_blur or []
    urls = publication.media_urls[:10]
    logger.info(f"Preparing media_group: {len(urls)} files, file_ids={publication.media_file_ids}")

    media: list = []
    for i, url in enumerate(urls):
        file_id = get_file_id_for_media(publication.media_file_ids, i)
        media_to_send = file_id if file_id else url
        file_spoiler = get_spoiler(blur_list, i)
        is_first = i == 0
        caption = caption_text if is_first and caption_text else None

        logger.info(f"Media {i+1}/{len(urls)}: using {'file_id' if file_id else 'URL'} = {str(media_to_send)[:50]}...")

        media.append(build_media_item(url, media_to_send, caption, file_spoiler))

    messages = await bot.send_media_group(
        chat_id=channel.telegram_id, media=media,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id,
    )
    return list(messages)


def build_media_item(url: str, media_to_send, caption: Optional[str], spoiler: bool):
    """Создать InputMedia элемент для медиа-группы."""
    kwargs = {"media": media_to_send}
    if caption:
        kwargs["caption"] = caption
        kwargs["parse_mode"] = ParseMode.HTML

    if is_document_url(url):
        return InputMediaDocument(**kwargs)
    if is_audio_url(url):
        return InputMediaAudio(**kwargs)
    if is_video_url(url):
        return InputMediaVideo(**kwargs, has_spoiler=spoiler)
    return InputMediaPhoto(**kwargs, has_spoiler=spoiler)
