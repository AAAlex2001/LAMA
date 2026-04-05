from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
    TelegramMessage,
)
from backend.schemas.publications.publication_update import PublicationUpdate


class PublicationUpdateService:
    """Update and delete publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_publication(
        self,
        publication: Publication,
        data: PublicationUpdate,
        owner_id: Optional[int] = None,
    ) -> Publication:
        update_data = data.model_dump(exclude_unset=True)

        if "channel_ids" in update_data:
            channel_ids = update_data.pop("channel_ids")
            from backend.services.publications.publication_create_service import PublicationCreateService
            creator = PublicationCreateService(self.db)
            channels = await creator._get_channels_by_ids(channel_ids, owner_id=owner_id)
            if owner_id is not None and channel_ids and len(channels) != len(set(channel_ids)):
                raise HTTPException(status_code=400, detail="One or more channels not found")
            publication.channels = channels

        tag_colors_list = update_data.pop("tag_colors", None)
        tag_color_single = update_data.pop("tag_color", None)
        if "tag_names" in update_data:
            from backend.services.publications.tag_service import TagService
            tag_service = TagService(self.db)
            publication.tags = await tag_service.get_or_create_tags(
                update_data.pop("tag_names"),
                tag_color=tag_color_single,
                tag_colors=tag_colors_list,
                owner_id=owner_id,
            )

        if "inline_keyboard" in update_data:
            val = update_data["inline_keyboard"]
            update_data["inline_keyboard"] = val.model_dump() if val and hasattr(val, "model_dump") else val

        if "poll_data" in update_data:
            val = update_data["poll_data"]
            update_data["poll_data"] = val.model_dump() if val and hasattr(val, "model_dump") else val

        auto_seconds = update_data.pop("auto_delete_delay_seconds", None)
        if auto_seconds is not None:
            update_data["auto_delete_seconds"] = auto_seconds
        elif "auto_delete_hours" in update_data:
            hours = update_data["auto_delete_hours"]
            update_data["auto_delete_seconds"] = hours * 3600 if hours is not None else None

        if "content_type" in update_data:
            update_data["content_type"] = DBContentType[update_data["content_type"].value.upper()]
        if "status" in update_data:
            update_data["status"] = DBPublicationStatus[update_data["status"].value.upper()]
        if "repeat_custom_unit" in update_data:
            unit = update_data["repeat_custom_unit"]
            update_data["repeat_custom_unit"] = unit.value if hasattr(unit, "value") else unit

        for key, value in update_data.items():
            setattr(publication, key, value)

        publication.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(publication)
        return publication

    async def delete_publication(self, publication: Publication) -> None:
        await self.db.delete(publication)
        await self.db.flush()

    async def stop_repeat_from(self, publication: Publication, from_date: datetime) -> None:
        publication.repeat_end_time = from_date
        publication.next_repeat_time = None
        await self.db.flush()

    async def cancel_repeat(self, publication: Publication) -> None:
        publication.repeat_interval = DBRepeatInterval.NEVER
        publication.repeat_end_time = None
        publication.next_repeat_time = None
        publication.repeat_custom_days = None
        publication.repeat_custom_hours = None
        publication.repeat_custom_unit = None
        publication.repeat_custom_value = None
        publication.repeat_weekdays = None
        publication.repeat_month_days = None
        publication.repeat_year_month = None
        publication.repeat_year_days = None
        await self.db.flush()

    async def add_repeat_exclusion(self, publication: Publication, date_str: str) -> None:
        excluded = list(publication.repeat_excluded_dates or [])
        if date_str not in excluded:
            excluded.append(date_str)
        publication.repeat_excluded_dates = excluded
        await self.db.flush()

    async def reschedule_publication(self, publication: Publication, new_time: datetime) -> Publication:
        publication.scheduled_time = new_time
        publication.status = DBPublicationStatus.SCHEDULED
        await self.db.flush()
        await self.db.refresh(publication)
        return publication
