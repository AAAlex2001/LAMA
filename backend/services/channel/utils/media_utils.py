"""Хелперы для работы с медиа из aiogram-сообщений: определение типа, извлечение file_id, сборка InputMedia для ретрансляции."""

from typing import List, Optional

from aiogram.enums import ParseMode
from aiogram.types import (
    InputMediaAnimation,
    InputMediaAudio,
    InputMediaDocument,
    InputMediaPhoto,
    InputMediaVideo,
    Message,
)

from backend.models.channels import BackedUpPost


def extract_content_type(message: Message) -> str:
    """Определить тип контента сообщения."""
    if message.photo:
        return "photo"
    if message.video:
        return "video"
    if message.document:
        return "document"
    if message.audio:
        return "audio"
    if message.voice:
        return "voice"
    if message.animation:
        return "animation"
    if message.sticker:
        return "sticker"
    return "text"


def extract_media_file_ids(message: Message) -> List[str]:
    """Извлечь file_id из сообщения."""
    if message.photo:
        return [message.photo[-1].file_id]
    if message.video:
        return [message.video.file_id]
    if message.document:
        return [message.document.file_id]
    if message.audio:
        return [message.audio.file_id]
    if message.voice:
        return [message.voice.file_id]
    if message.animation:
        return [message.animation.file_id]
    if message.sticker:
        return [message.sticker.file_id]
    return []


MEDIA_TYPE_MAP = {
    "photo": lambda entry: entry.get("photo", [{}])[-1].get("file_id") if entry.get("photo") else None,
    "video": lambda entry: entry.get("video", {}).get("file_id"),
    "document": lambda entry: entry.get("document", {}).get("file_id"),
    "audio": lambda entry: entry.get("audio", {}).get("file_id"),
    "animation": lambda entry: entry.get("animation", {}).get("file_id"),
}

MEDIA_CLASS_MAP = {
    "photo": InputMediaPhoto,
    "video": InputMediaVideo,
    "document": InputMediaDocument,
    "audio": InputMediaAudio,
    "animation": InputMediaAnimation,
}

SPOILER_TYPES = {"photo", "video", "animation"}


def detect_entry_type(entry: dict) -> Optional[str]:
    """Определить тип медиа из raw_data записи."""
    for media_type in MEDIA_TYPE_MAP:
        if entry.get(media_type):
            return media_type
    return None


def build_media_inputs(post: BackedUpPost) -> list:
    """Собрать список InputMedia из raw_data бекапа."""
    raw_entries = post.raw_data if isinstance(post.raw_data, list) else [post.raw_data]
    media_inputs = []

    for index, entry in enumerate(raw_entries):
        if not isinstance(entry, dict):
            continue

        media_type = detect_entry_type(entry)
        if not media_type:
            continue

        file_id = MEDIA_TYPE_MAP[media_type](entry)
        if not file_id:
            continue

        caption = post.text_content if index == 0 else None
        parse_mode = ParseMode.HTML if caption else None
        has_spoiler = entry.get("has_media_spoiler", False)

        media_class = MEDIA_CLASS_MAP[media_type]
        kwargs = {"media": file_id, "caption": caption, "parse_mode": parse_mode}
        if media_type in SPOILER_TYPES:
            kwargs["has_spoiler"] = has_spoiler

        media_inputs.append(media_class(**kwargs))

    return media_inputs
