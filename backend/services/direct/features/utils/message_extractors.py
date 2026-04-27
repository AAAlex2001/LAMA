"""Pure-helpers для разбора aiogram Message / dict, пришедшего из вебхука."""

from collections.abc import Sequence
from typing import Any, Optional

from aiogram.types import Message
from fastapi import HTTPException


def message_get(message: Message | dict, key: str, default: Any = None) -> Any:
    """getattr/getitem поддержка для случаев когда message — dict из payload."""
    if isinstance(message, dict):
        return message.get(key, default)
    return getattr(message, key, default)


def get_raw_message_data(message: Message | dict) -> dict:
    """Превращает aiogram-объект в dict; dict возвращает as-is."""
    if isinstance(message, dict):
        return message
    return message.model_dump(mode="python", by_alias=True)


def extract_nested_id(value: Any, key: str = "id") -> Optional[int]:
    """Достаёт id (или другой ключ) у nested-объекта; 404 если нет."""
    if value is None:
        raise HTTPException(status_code=404, detail="Message not found or access denied")
    nested_value = value.get(key) if isinstance(value, dict) else getattr(value, key, None)
    if nested_value is None:
        raise HTTPException(status_code=404, detail="Message not found or access denied")
    return int(nested_value)


def extract_file_id_from_entity(entity: Any) -> Optional[str]:
    """Достаёт file_id у одного медиа-объекта (PhotoSize/Video/Document/...)."""
    if entity is None:
        return None
    file_id = entity.get("file_id") if isinstance(entity, dict) else getattr(entity, "file_id", None)
    return str(file_id) if file_id else None


def extract_file_id_from_collection(collection: Any) -> Optional[str]:
    """Для photo[] берёт самый крупный размер (последний); иначе entity."""
    if not collection:
        return None
    if isinstance(collection, Sequence) and not isinstance(collection, (str, bytes, bytearray)):
        return extract_file_id_from_entity(collection[-1])
    return extract_file_id_from_entity(collection)
