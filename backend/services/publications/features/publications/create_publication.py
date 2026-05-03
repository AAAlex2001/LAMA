"""Создание публикации с привязкой каналов и тегов."""

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.schemas.publications.publications import PublicationCreate
from backend.services.publications.features.publications.lookup import find_owned_channels
from backend.services.publications.features.tags.get_or_create_tags import GetOrCreateTags


class CreatePublication:
    """Создаёт Publication, прикрепляя выбранные каналы и (опц.) теги."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, data: PublicationCreate, owner_id: int) -> Publication:
        """Бросает 400 если хотя бы один из channel_ids не принадлежит пользователю."""
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
            auto_delete_seconds=resolve_auto_delete_seconds(data),
            repeat_interval=resolve_repeat_interval(data.repeat_interval),
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
            channels = await find_owned_channels(self.db, data.channel_ids, owner_id)
            if len(channels) != len(set(data.channel_ids)):
                raise HTTPException(
                    status_code=400,
                    detail="One or more channels not found or do not belong to the user",
                )
            publication.channels = channels

        if data.tag_names:
            publication.tags = await GetOrCreateTags(self.db).execute(
                data.tag_names,
                tag_color=data.tag_color,
                tag_colors=data.tag_colors,
                owner_id=owner_id,
            )

        self.db.add(publication)
        await self.db.flush()
        await self.db.refresh(publication, ["channels", "tags", "series"])
        return publication


def resolve_auto_delete_seconds(data: PublicationCreate) -> int | None:
    """Auto-delete: если есть seconds — берём, иначе hours*3600."""
    if data.auto_delete_delay_seconds is not None:
        return data.auto_delete_delay_seconds
    if data.auto_delete_hours is not None:
        return data.auto_delete_hours * 3600
    return None


def resolve_repeat_interval(value) -> DBRepeatInterval:
    """Принимает строку или enum схемы → enum модели."""
    if isinstance(value, str):
        return DBRepeatInterval[value.upper()]
    return DBRepeatInterval[value.name]
