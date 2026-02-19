from datetime import datetime, timezone
from typing import Dict, List, Optional

import pytz
from sqlalchemy import and_, exists, select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationNotification,
    PublicationSeries,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
    Tag,
    TelegramMessage,
    publication_channels,
    publication_tags,
)
from backend.schemas.publications import (
    ContentType,
    PublicationCreate,
    PublicationStatus,
    PublicationUpdate,
)


def escape_like(s: str) -> str:
    """Escape special LIKE/ILIKE characters."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class PublicationPostsCRUDService:
    """CRUD-операции для публикаций, тегов, каналов и календаря."""

    def __init__(self, db: AsyncSession):
        """Инициализировать сервис с асинхронной сессией БД."""
        self.db = db

    async def create_publication(self, data: PublicationCreate, owner_id: int) -> Publication:
        """Создать публикацию с каналами и тегами владельца."""
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
            channels = await self.get_channels_by_ids(data.channel_ids, owner_id=owner_id)
            if len(channels) != len(set(data.channel_ids)):
                raise ValueError("One or more channels not found or do not belong to the user")
            publication.channels = channels

        if data.tag_names:
            tags = await self.get_or_create_tags(
                data.tag_names,
                tag_color=data.tag_color,
                tag_colors=data.tag_colors,
                owner_id=owner_id,
            )
            publication.tags = tags

        self.db.add(publication)
        await self.db.commit()
        await self.db.refresh(publication, ["channels", "tags", "series"])
        for channel in publication.channels:
            await self.db.refresh(channel, ["bot"])
        return publication

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None) -> Optional[Publication]:
        """Получить публикацию по ID с загруженными связями."""
        query = select(Publication).where(Publication.id == publication_id).options(
            selectinload(Publication.channels).selectinload(Channel.bot),
            selectinload(Publication.tags),
            selectinload(Publication.series),
            selectinload(Publication.telegram_messages)
            .selectinload(TelegramMessage.channel)
            .selectinload(Channel.bot),
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_publications(
        self,
        owner_id: Optional[int] = None,
        status: Optional[PublicationStatus] = None,
        content_type: Optional[ContentType] = None,
        channel_id: Optional[int] = None,
        tag_names: Optional[List[str]] = None,
        tag_ids: Optional[List[int]] = None,
        series_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        sort_order: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Publication]:
        """Получить список публикаций с фильтрами и стабильной пагинацией."""
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        id_query = select(Publication.id)
        if owner_id is not None:
            id_query = id_query.where(Publication.owner_id == owner_id)

        filters = []
        if status:
            filters.append(Publication.status == DBPublicationStatus[status.value.upper()])
        if content_type:
            filters.append(Publication.content_type == DBContentType[content_type.value.upper()])
        if series_id:
            filters.append(Publication.series_id == series_id)
        if start_date:
            filters.append(Publication.scheduled_time >= start_date)
        if end_date:
            filters.append(Publication.scheduled_time <= end_date)
        if filters:
            id_query = id_query.where(and_(*filters))

        if channel_id:
            id_query = id_query.where(
                exists(
                    select(1)
                    .select_from(publication_channels)
                    .where(
                        publication_channels.c.publication_id == Publication.id,
                        publication_channels.c.channel_id == channel_id,
                    )
                )
            )

        if tag_ids:
            id_query = id_query.where(
                exists(
                    select(1)
                    .select_from(publication_tags)
                    .where(
                        publication_tags.c.publication_id == Publication.id,
                        publication_tags.c.tag_id.in_(tag_ids),
                    )
                )
            )
        elif tag_names:
            tag_exists_query = (
                select(1)
                .select_from(publication_tags.join(Tag, Tag.id == publication_tags.c.tag_id))
                .where(
                    publication_tags.c.publication_id == Publication.id,
                    Tag.name.in_(tag_names),
                )
            )
            if owner_id is not None:
                tag_exists_query = tag_exists_query.where(Tag.owner_id == owner_id)
            id_query = id_query.where(exists(tag_exists_query))

        if search:
            search_text = search.strip()
            if search_text:
                id_query = id_query.where(Publication.text_content.ilike(f"%{escape_like(search_text)}%"))

        source_date = func.coalesce(Publication.scheduled_time, Publication.updated_at, Publication.created_at)
        order_asc = (sort_order or '').lower() == 'asc'
        order_expr = source_date.asc() if order_asc else source_date.desc()
        id_tie_breaker = Publication.id.asc() if order_asc else Publication.id.desc()

        id_subquery = (
            id_query
            .order_by(order_expr, id_tie_breaker)
            .offset(skip)
            .limit(limit)
            .subquery()
        )

        publications_query = (
            select(Publication)
            .join(id_subquery, Publication.id == id_subquery.c.id)
            .options(
                selectinload(Publication.channels).selectinload(Channel.bot),
                selectinload(Publication.tags),
                selectinload(Publication.series),
            )
            .order_by(order_expr, id_tie_breaker)
        )

        result = await self.db.execute(publications_query)
        return list(result.scalars().all())

    async def update_publication(
        self,
        publication_id: int,
        data: PublicationUpdate,
        owner_id: Optional[int] = None,
    ) -> Optional[Publication]:
        """Обновить публикацию и связанные сущности (каналы/теги)."""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if "channel_ids" in update_data:
            channel_ids = update_data.pop("channel_ids")
            channels = await self.get_channels_by_ids(channel_ids, owner_id=owner_id)
            if owner_id is not None and channel_ids and len(channels) != len(set(channel_ids)):
                raise ValueError("One or more channels not found or do not belong to the user")
            publication.channels = channels

        tag_colors_list = update_data.pop("tag_colors", None)
        tag_color_single = update_data.pop("tag_color", None)
        if "tag_names" in update_data:
            tags = await self.get_or_create_tags(
                update_data.pop("tag_names"),
                tag_color=tag_color_single,
                tag_colors=tag_colors_list,
                owner_id=owner_id,
            )
            publication.tags = tags

        if "inline_keyboard" in update_data:
            value = update_data["inline_keyboard"]
            update_data["inline_keyboard"] = value.model_dump() if value and hasattr(value, "model_dump") else value

        if "poll_data" in update_data:
            value = update_data["poll_data"]
            update_data["poll_data"] = value.model_dump() if value and hasattr(value, "model_dump") else value

        auto_delete_delay_seconds = update_data.pop("auto_delete_delay_seconds", None)
        if auto_delete_delay_seconds is not None:
            update_data["auto_delete_seconds"] = auto_delete_delay_seconds
        elif "auto_delete_hours" in update_data:
            hours_value = update_data["auto_delete_hours"]
            update_data["auto_delete_seconds"] = hours_value * 3600 if hours_value is not None else None

        if "content_type" in update_data:
            update_data["content_type"] = DBContentType[update_data["content_type"].value.upper()]
        if "status" in update_data:
            update_data["status"] = DBPublicationStatus[update_data["status"].value.upper()]
        if "repeat_custom_unit" in update_data:
            unit_value = update_data["repeat_custom_unit"]
            update_data["repeat_custom_unit"] = unit_value.value if hasattr(unit_value, "value") else unit_value

        for key, value in update_data.items():
            setattr(publication, key, value)

        publication.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(publication)
        return publication

    async def delete_publication(self, publication_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить публикацию по ID."""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return False
        await self.db.delete(publication)
        await self.db.commit()
        return True

    async def get_channels_by_ids(self, channel_ids: List[int], owner_id: Optional[int] = None) -> List[Channel]:
        """Получить каналы по списку ID c optional-фильтром владельца."""
        query = select(Channel).options(selectinload(Channel.bot)).where(Channel.id.in_(channel_ids))
        if owner_id is not None:
            query = query.where(Channel.owner_id == owner_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_or_create_tags(
        self,
        tag_names: List[str],
        tag_color: Optional[str] = None,
        tag_colors: Optional[List[str]] = None,
        owner_id: Optional[int] = None,
    ) -> List[Tag]:
        """Получить существующие теги или создать отсутствующие."""
        query = select(Tag).where(Tag.name.in_(tag_names))
        if owner_id is not None:
            query = query.where(Tag.owner_id == owner_id)
        result = await self.db.execute(query)
        existing_tags = {tag.name: tag for tag in result.scalars().all()}

        tags: List[Tag] = []
        new_tags: List[Tag] = []
        now = datetime.now(timezone.utc)

        for idx, name in enumerate(tag_names):
            color = tag_colors[idx] if tag_colors and idx < len(tag_colors) else tag_color
            if name in existing_tags:
                tag = existing_tags[name]
                if color and tag.color != color:
                    tag.color = color
                tag.last_used_at = now
                tags.append(tag)
            else:
                new_tag = Tag(name=name, color=color, last_used_at=now, owner_id=owner_id)
                new_tags.append(new_tag)
                tags.append(new_tag)

        if new_tags:
            self.db.add_all(new_tags)
            try:
                await self.db.begin_nested()
                await self.db.flush()
            except IntegrityError:
                # Only the savepoint is rolled back, rest of session survives
                query = select(Tag).where(Tag.name.in_(tag_names))
                if owner_id is not None:
                    query = query.where(Tag.owner_id == owner_id)
                result = await self.db.execute(query)
                existing_tags = {tag.name: tag for tag in result.scalars().all()}
                tags = [existing_tags[name] for name in tag_names if name in existing_tags]
                for tag in tags:
                    tag.last_used_at = now

        return tags

    async def create_notification(
        self,
        publication_id: int,
        status: str,
        message: str,
        error_details: Optional[Dict] = None,
    ):
        """Создать уведомление о статусе публикации."""
        notification = PublicationNotification(
            publication_id=publication_id,
            status=status,
            message=message,
            error_details=error_details,
        )
        self.db.add(notification)
        await self.db.flush()

    async def create_series(
        self,
        name: str,
        description: Optional[str] = None,
        reply_to_previous: bool = True,
    ) -> PublicationSeries:
        """Создать серию публикаций."""
        series = PublicationSeries(name=name, description=description, reply_to_previous=reply_to_previous)
        self.db.add(series)
        await self.db.commit()
        await self.db.refresh(series)
        return series

    async def reschedule_publication(
        self,
        publication_id: int,
        new_time: datetime,
        owner_id: Optional[int] = None,
    ) -> Optional[Publication]:
        """Перенести публикацию на новое время и вернуть обновлённую запись."""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return None
        publication.scheduled_time = new_time
        publication.status = DBPublicationStatus.SCHEDULED
        await self.db.commit()
        await self.db.refresh(publication)
        return publication

    async def get_calendar(self, year: int, month: int, owner_id: Optional[int] = None) -> List[Publication]:
        """Получить публикации за месяц для календарного представления."""

        start_date = datetime(year, month, 1, tzinfo=pytz.UTC)
        end_date = datetime(year + 1, 1, 1, tzinfo=pytz.UTC) if month == 12 else datetime(year, month + 1, 1, tzinfo=pytz.UTC)

        query = (
            select(Publication)
            .where(
                and_(
                    Publication.scheduled_time >= start_date,
                    Publication.scheduled_time < end_date,
                    Publication.status.in_([DBPublicationStatus.SCHEDULED, DBPublicationStatus.PUBLISHED]),
                )
            )
            .options(selectinload(Publication.channels), selectinload(Publication.tags))
            .order_by(Publication.scheduled_time)
            .limit(500)
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_day_counts(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: Optional[int] = None,
    ) -> Dict[str, int]:
        """Быстрый подсчёт публикаций по дням (SQL GROUP BY, без загрузки объектов)."""
        source_date = Publication.scheduled_time
        date_expr = func.date(source_date)
        query = (
            select(date_expr.label("day"), func.count().label("cnt"))
            .where(
                and_(
                    Publication.scheduled_time.isnot(None),
                    source_date >= start_date,
                    source_date <= end_date,
                    Publication.status.notin_([
                        DBPublicationStatus.DELETED,
                    ]),
                )
            )
            .group_by(date_expr)
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        result = await self.db.execute(query)
        return {str(row.day): row.cnt for row in result.all()}
