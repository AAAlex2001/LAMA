"""Отправка SendMessageRequest в Telegram: альбом / одно медиа / просто текст."""

from typing import List, Optional

from aiogram.types import Message, URLInputFile

from backend.models.bots import MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.services.direct.features.utils.input_media import build_media_item
from backend.services.direct.features.utils.media_detectors import detect_media_type


async def send_to_telegram(
    client,
    tg_chat_id: int,
    request: SendMessageRequest,
    media_urls: List[str],
    reply_markup,
    reply_params: dict,
) -> List[Message]:
    """Маршрут: 0 url + text → text; 1 url → одно медиа; >1 url → альбом. Возвращает [] если нечего слать."""
    if len(media_urls) > 1:
        return await send_album(client, tg_chat_id, media_urls, request.text_content, reply_params)

    if len(media_urls) == 1:
        return await send_one(
            client, tg_chat_id, media_urls[0], request, reply_markup, reply_params,
        )

    if request.text_content:
        message = await client.send_message(
            chat_id=tg_chat_id,
            text=request.text_content,
            reply_markup=reply_markup,
            **reply_params,
        )
        return [message]

    return []


async def send_album(
    client, tg_chat_id: int, media_urls: List[str], caption: Optional[str], reply_params: dict,
) -> List[Message]:
    """Альбом из 2..10 медиа; caption на первом элементе."""
    media_group = [
        build_media_item(url, caption if i == 0 else None)
        for i, url in enumerate(media_urls[:10])
    ]
    return list(await client.send_media_group(
        chat_id=tg_chat_id, media=media_group, **reply_params,
    ))


async def send_one(
    client,
    tg_chat_id: int,
    media_url: str,
    request: SendMessageRequest,
    reply_markup,
    reply_params: dict,
) -> List[Message]:
    """Одиночное медиа: тип берём из request или определяем по URL."""
    message_type = request.media_type or detect_media_type(media_url)
    media = wrap_for_send(media_url, message_type)

    common = dict(
        chat_id=tg_chat_id,
        caption=request.text_content,
        reply_markup=reply_markup,
        **reply_params,
    )

    if message_type == MessageType.PHOTO:
        return [await client.send_photo(photo=media, **common)]
    if message_type == MessageType.VIDEO:
        return [await client.send_video(video=media, **common)]
    if message_type == MessageType.DOCUMENT:
        return [await client.send_document(document=media, **common)]
    if message_type == MessageType.AUDIO:
        return [await client.send_audio(audio=media, **common)]
    if message_type == MessageType.VOICE:
        return [await client.send_voice(voice=media, **common)]
    if message_type == MessageType.ANIMATION:
        return [await client.send_animation(animation=media, **common)]
    if message_type == MessageType.STICKER:
        return [await client.send_sticker(
            chat_id=tg_chat_id, sticker=media, reply_markup=reply_markup, **reply_params,
        )]

    if request.text_content:
        return [await client.send_message(
            chat_id=tg_chat_id,
            text=request.text_content,
            reply_markup=reply_markup,
            **reply_params,
        )]
    return []


def wrap_for_send(media_url: str, message_type: MessageType):
    """URLInputFile с filename для медиа-файлов; URL-строка для фото/стикера."""
    if message_type in (MessageType.VIDEO, MessageType.DOCUMENT, MessageType.AUDIO, MessageType.VOICE):
        filename = media_url.rsplit("/", 1)[-1].split("?")[0]
        return URLInputFile(media_url, filename=filename)
    return media_url
