"""Pure-helpers для определения типа медиа из Message / URL."""

from typing import Optional

from aiogram.types import Message
from fastapi import HTTPException

from backend.models.bots import MessageType
from backend.services.direct.features.utils.message_extractors import (
    extract_file_id_from_collection,
    extract_file_id_from_entity,
    get_raw_message_data,
    message_get,
)
from backend.services.publications.utils.media_utils import (
    is_audio_url,
    is_document_url,
    is_video_url,
)

NON_TEXT_FIELDS: tuple[tuple[str, MessageType], ...] = (
    ("video", MessageType.VIDEO),
    ("document", MessageType.DOCUMENT),
    ("audio", MessageType.AUDIO),
    ("voice", MessageType.VOICE),
    ("animation", MessageType.ANIMATION),
    ("sticker", MessageType.STICKER),
)


def detect_media_type(media_url: str) -> MessageType:
    """Тип по расширению URL: document/audio/video/photo (по дефолту)."""
    if is_document_url(media_url):
        return MessageType.DOCUMENT
    if is_audio_url(media_url):
        return MessageType.AUDIO
    if is_video_url(media_url):
        return MessageType.VIDEO
    return MessageType.PHOTO


def extract_incoming_media(message: Message | dict) -> tuple[MessageType, Optional[str]]:
    """Тип + file_id входящего медиа; (TEXT, None) если медиа нет."""
    raw_data = get_raw_message_data(message)

    photo = message_get(message, "photo") or raw_data.get("photo")
    photo_file_id = extract_file_id_from_collection(photo)
    if photo or photo_file_id:
        return MessageType.PHOTO, photo_file_id

    for field_name, message_type in NON_TEXT_FIELDS:
        entity = message_get(message, field_name) or raw_data.get(field_name)
        file_id = extract_file_id_from_entity(entity)
        if entity or file_id:
            return message_type, file_id

    return MessageType.TEXT, None


def extract_media_type(message: Message, fallback: MessageType = MessageType.TEXT) -> MessageType:
    """Тип медиа в исходящем aiogram Message; TEXT если только текст; fallback иначе."""
    if message.photo:
        return MessageType.PHOTO
    if message.video:
        return MessageType.VIDEO
    if message.document:
        return MessageType.DOCUMENT
    if message.audio:
        return MessageType.AUDIO
    if message.voice:
        return MessageType.VOICE
    if message.animation:
        return MessageType.ANIMATION
    if message.sticker:
        return MessageType.STICKER
    if message.text or message.caption:
        return MessageType.TEXT
    return fallback


def extract_media_file_id(message: Message, message_type: MessageType) -> Optional[str]:
    """file_id из соответствующего поля Message по типу; 404 если поле пусто."""
    if message_type == MessageType.TEXT:
        return None
    field = pick_field_for_type(message, message_type)
    if field is None:
        raise HTTPException(status_code=404, detail="Media file not found")
    if message_type == MessageType.PHOTO:
        return field[-1].file_id
    return field.file_id


def pick_field_for_type(message: Message, message_type: MessageType):
    """Возвращает соответствующий атрибут Message (или None)."""
    if message_type == MessageType.PHOTO:
        return message.photo
    if message_type == MessageType.VIDEO:
        return message.video
    if message_type == MessageType.DOCUMENT:
        return message.document
    if message_type == MessageType.AUDIO:
        return message.audio
    if message_type == MessageType.VOICE:
        return message.voice
    if message_type == MessageType.ANIMATION:
        return message.animation
    if message_type == MessageType.STICKER:
        return message.sticker
    return None
