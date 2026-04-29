"""Отправка SendMessageRequest в Telegram: альбом / одно медиа / просто текст."""

from typing import List, Union

from aiogram.types import (
    InputMediaDocument,
    InputMediaPhoto,
    InputMediaVideo,
    Message,
)

from backend.models.bots import MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.utils.media import is_document_url, is_video_url

MEDIA_SEND_METHODS = {
    MessageType.PHOTO: "send_photo",
    MessageType.VIDEO: "send_video",
    MessageType.DOCUMENT: "send_document",
}


async def dispatch_telegram(
    telegram_bot, data: SendMessageRequest, reply_markup,
) -> Union[Message, List[Message]]:
    """media_urls > 1 → альбом; ровно 1 + media_type → одиночное медиа; иначе — текст."""
    reply_params = build_reply_params(data)
    media_urls = collect_media_urls(data)

    if len(media_urls) > 1:
        return await send_album(telegram_bot, data.chat_id, media_urls, data.text_content, reply_params)

    if len(media_urls) == 1 and data.media_type and data.media_type in MEDIA_SEND_METHODS:
        return await send_single_media(
            telegram_bot, data.chat_id, media_urls[0], data, reply_markup, reply_params,
        )

    return await telegram_bot.send_message(
        chat_id=data.chat_id,
        text=data.text_content or "No content",
        reply_markup=reply_markup,
        **reply_params,
    )


def build_reply_params(data: SendMessageRequest) -> dict:
    """{'reply_to_message_id': X} или пустой dict."""
    if data.reply_to_message_id:
        return {"reply_to_message_id": data.reply_to_message_id}
    return {}


def collect_media_urls(data: SendMessageRequest) -> list[str]:
    """media_urls > media_url > []."""
    urls = [u for u in (data.media_urls or []) if u]
    if urls:
        return urls
    return [data.media_url] if data.media_url else []


async def send_album(
    telegram_bot, chat_id: int, urls: list[str], caption, reply_params: dict,
) -> List[Message]:
    """До 10 элементов; caption на первом."""
    media_group = [build_album_item(url, caption if i == 0 else None) for i, url in enumerate(urls[:10])]
    messages = await telegram_bot.send_media_group(
        chat_id=chat_id, media=media_group, **reply_params,
    )
    return list(messages)


def build_album_item(url: str, caption):
    """InputMedia* по типу URL."""
    if is_video_url(url):
        return InputMediaVideo(media=url, caption=caption)
    if is_document_url(url):
        return InputMediaDocument(media=url, caption=caption)
    return InputMediaPhoto(media=url, caption=caption)


async def send_single_media(
    telegram_bot, chat_id: int, url: str, data: SendMessageRequest, reply_markup, reply_params: dict,
) -> Message:
    """send_photo/send_video/send_document по data.media_type."""
    method = getattr(telegram_bot, MEDIA_SEND_METHODS[data.media_type])
    return await method(
        chat_id=chat_id,
        **{data.media_type.value.lower(): url},
        caption=data.text_content,
        reply_markup=reply_markup,
        **reply_params,
    )
