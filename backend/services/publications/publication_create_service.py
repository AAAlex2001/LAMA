from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
    Tag,
    TelegramMessage,
    publication_channels,
)
from backend.schemas.publications.publication_base import PublicationCreate


class PublicationCreateService:
    """Create publications with channels and tags."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_publication(self, data: PublicationCreate, owner_id: int) -> Publication:
        auto_delete_seconds = data.auto_delete_delay_seconds
        if auto_delete_seconds is None and data.auto_delete_hours is not None:
            auto_delete_seconds = data.auto_delete_hours * 3600

        publication = Publication(
            owner_id=owner_id,
            content_type=DBContentType[data.content_type.value.upper()],
            status=DBPublicationStatus[data.status.value.upper()] if data.status else DBPublicationStatus.DRAFT,
            text_content=data.text_content,
            formatted_content=data.formatted_content,
            media_urls=data.media_urls,
            media_file_ids=data.media_file_ids,
            media_thumbnail_urls=data.media_thumbnail_urls,
            media_blur=data.media_blur,
            inline_keyboard=data.inline_keyboard.model_dump() if data.inline_keyboard else None,
            poll_data=data.poll_data.model_dump() if data.poll_data else None,
            pin_message=data.pin_message,
            disable_notification=data.disable_notification,
            disable_web_page_preview=data.disable_web_page_preview,
            auto_delete_hours=data.auto_delete_hours,
            auto_delete_seconds=auto_delete_seconds,
            repeat_interval=DBRepeatInterval[data.repeat_interval.upper()] if isinstance(data.repeat_interval, str) else DBRepeatInterval[data.repeat_interval.name],
            repeat_custom_days=data.repeat_custom_days,
            repeat_custom_hours=data.repeat_custom_hours,
            repeat_custom_unit=data.repeat_custom_unit.value if data.repeat_custom_unit else None,
            repeat_custom_value=data.repeat_custom_value,
            repeat_weekdays=data.repeat_weekdays,
            repeat_month_days=data.repeat_month_days,
            repeat_year_month=data.repeat_year_month,
            repeat_year_days=data.repeat_year_days,
            repeat_end_time=data.repeat_end_time,
            scheduled_time=data.scheduled_time,
            timezone=data.timezone,
            series_id=data.series_id,
            series_order=data.series_order,
            reply_to_post_id=data.reply_to_post_id,
            ai_generated=bool(data.ai_prompt),
            ai_prompt=data.ai_prompt,
        )

        if data.channel_ids:
            channels = await self._get_channels_by_ids(data.channel_ids, owner_id)
            if len(channels) != len(set(data.channel_ids)):
                raise HTTPException(status_code=400, detail="One or more channels not found or do not belong to the user")
            publication.channels = channels

        if data.tag_names:
            from backend.services.publications.tag_service import TagService
            tag_service = TagService(self.db)
            publication.tags = await tag_service.get_or_create_tags(
                data.tag_names, tag_color=data.tag_color, tag_colors=data.tag_colors, owner_id=owner_id,
            )

        self.db.add(publication)
        await self.db.flush()
        await self.db.refresh(publication, ["channels", "tags", "series"])
        return publication

    async def _get_channels_by_ids(self, channel_ids: List[int], owner_id: int) -> List[Channel]:
        query = (
            select(Channel)
            .options(selectinload(Channel.bot))
            .where(Channel.id.in_(channel_ids), Channel.owner_id == owner_id)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
