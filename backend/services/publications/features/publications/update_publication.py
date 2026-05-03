"""Обновление публикации (поля + каналы + теги)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.publications import PublicationUpdate
from backend.services.publications.features.publications.lookup import find_owned_channels
from backend.services.publications.features.tags.get_or_create_tags import GetOrCreateTags


class UpdatePublication:
    """Точечное обновление полей публикации, переподписка каналов и тегов."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        publication: Publication,
        data: PublicationUpdate,
        owner_id: Optional[int] = None,
    ) -> Publication:
        """Применяет только реально переданные поля (exclude_unset)."""
        update_data = data.model_dump(exclude_unset=True)

        if "channel_ids" in update_data:
            channel_ids = update_data.pop("channel_ids")
            channels = await find_owned_channels(self.db, channel_ids or [], owner_id) if owner_id is not None else []
            if owner_id is not None and channel_ids and len(channels) != len(set(channel_ids)):
                raise HTTPException(status_code=400, detail="One or more channels not found")
            publication.channels = channels

        tag_colors = update_data.pop("tag_colors", None)
        tag_color = update_data.pop("tag_color", None)
        if "tag_names" in update_data:
            publication.tags = await GetOrCreateTags(self.db).execute(
                update_data.pop("tag_names"),
                tag_color=tag_color,
                tag_colors=tag_colors,
                owner_id=owner_id,
            )

        normalize_keyboard_field(update_data, "inline_keyboard")
        normalize_keyboard_field(update_data, "poll_data")
        normalize_auto_delete(update_data)
        normalize_enums(update_data)

        for key, value in update_data.items():
            setattr(publication, key, value)

        publication.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(publication)
        return publication


def normalize_keyboard_field(update_data: dict, key: str) -> None:
    """Pydantic-модели inline_keyboard/poll_data → dict."""
    if key in update_data:
        val = update_data[key]
        update_data[key] = val.model_dump() if val and hasattr(val, "model_dump") else val


def normalize_auto_delete(update_data: dict) -> None:
    """auto_delete_delay_seconds → auto_delete_seconds; либо hours*3600."""
    seconds = update_data.pop("auto_delete_delay_seconds", None)
    if seconds is not None:
        update_data["auto_delete_seconds"] = seconds
    elif "auto_delete_hours" in update_data:
        hours = update_data["auto_delete_hours"]
        update_data["auto_delete_seconds"] = hours * 3600 if hours is not None else None


def normalize_enums(update_data: dict) -> None:
    """Enum-поля схемы → enum модели."""
    if "content_type" in update_data:
        update_data["content_type"] = DBContentType[update_data["content_type"].value.upper()]
    if "status" in update_data:
        update_data["status"] = DBPublicationStatus[update_data["status"].value.upper()]
    if "repeat_custom_unit" in update_data:
        unit = update_data["repeat_custom_unit"]
        update_data["repeat_custom_unit"] = unit.value if hasattr(unit, "value") else unit
