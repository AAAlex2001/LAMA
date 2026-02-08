from datetime import datetime, timezone
from typing import List, Optional, Dict
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
import logging

from backend.models.publications import (
    Publication, Tag, PublicationSeries,
    TelegramMessage, PublicationNotification,
    PublicationStatus as DBPublicationStatus,
    ContentType as DBContentType,
    RepeatInterval as DBRepeatInterval,
    TextTemplate
)
from backend.models.channels import ChannelGroup as Channel
from backend.schemas.publications import (
    PublicationCreate, PublicationUpdate,
    PublicationStatus, ContentType,
    TextTemplateCreate, TextTemplateUpdate
)

logger = logging.getLogger(__name__)


class CRUDPublicationService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_publication(self, data: PublicationCreate, owner_id: int) -> Publication:
        """Создать публикацию"""
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
            repeat_interval=DBRepeatInterval[data.repeat_interval.upper()] if isinstance(
                data.repeat_interval, str) else DBRepeatInterval[data.repeat_interval.name],
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
            ai_prompt=data.ai_prompt
        )

        if data.channel_ids:
            channels = await self.get_channels_by_ids(data.channel_ids, owner_id=owner_id)
            if len(channels) != len(set(data.channel_ids)):
                raise ValueError(
                    "One or more channels not found or do not belong to the user")
            publication.channels = channels

        if data.tag_names:
            tags = await self.get_or_create_tags(data.tag_names, data.tag_color, owner_id=owner_id)
            publication.tags = tags

        logger.info(f"Before commit: publication.media_thumbnail_urls={publication.media_thumbnail_urls}")
        self.db.add(publication)
        await self.db.commit()
        logger.info(f"After commit, before refresh: publication.media_thumbnail_urls={publication.media_thumbnail_urls}")
        await self.db.refresh(publication, ['channels', 'tags', 'series'])
        logger.info(f"After refresh: publication.media_thumbnail_urls={publication.media_thumbnail_urls}")
        for channel in publication.channels:
            await self.db.refresh(channel, ['bot'])

        return publication

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None) -> Optional[Publication]:
        """Получить публикацию по ID"""
        query = select(Publication).where(Publication.id == publication_id).options(
            selectinload(Publication.channels).selectinload(Channel.bot),
            selectinload(Publication.tags),
            selectinload(Publication.series),
            selectinload(Publication.telegram_messages)
            .selectinload(TelegramMessage.channel)
            .selectinload(Channel.bot)
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
        skip: int = 0,
        limit: int = 100
    ) -> List[Publication]:
        """Получить список публикаций с фильтрацией"""
        base_query = select(Publication).options(
            selectinload(Publication.channels).selectinload(Channel.bot),
            selectinload(Publication.tags),
            selectinload(Publication.series)
        )

        if owner_id is not None:
            base_query = base_query.where(Publication.owner_id == owner_id)

        filters = []
        if status:
            filters.append(Publication.status ==
                           DBPublicationStatus[status.value.upper()])
        if content_type:
            filters.append(Publication.content_type ==
                           DBContentType[content_type.value.upper()])
        if series_id:
            filters.append(Publication.series_id == series_id)
        if start_date:
            filters.append(Publication.scheduled_time >= start_date)
        if end_date:
            filters.append(Publication.scheduled_time <= end_date)

        if filters:
            base_query = base_query.where(and_(*filters))

        if channel_id:
            base_query = base_query.join(
                Publication.channels).where(Channel.id == channel_id)

        if tag_ids:
            base_query = base_query.join(
                Publication.tags).where(Tag.id.in_(tag_ids))
        elif tag_names:
            base_query = base_query.join(
                Publication.tags).where(Tag.name.in_(tag_names))

        if search:
            base_query = base_query.where(Publication.text_content.ilike(f'%{search}%'))

        ordered_query = base_query.order_by(Publication.created_at.desc())

        paginated_query = ordered_query.offset(skip).limit(limit)
        result = await self.db.execute(paginated_query)
        publications = result.unique().scalars().all()

        return list(publications)

    async def update_publication(
        self,
        publication_id: int,
        data: PublicationUpdate,
        owner_id: Optional[int] = None
    ) -> Optional[Publication]:
        """Обновить публикацию"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return None

        update_data = data.model_dump(exclude_unset=True)

        if 'channel_ids' in update_data:
            channel_ids = update_data.pop('channel_ids')
            channels = await self.get_channels_by_ids(channel_ids, owner_id=owner_id)
            if owner_id is not None and channel_ids and len(channels) != len(set(channel_ids)):
                raise ValueError(
                    "One or more channels not found or do not belong to the user")
            publication.channels = channels

        if 'tag_names' in update_data:
            tags = await self.get_or_create_tags(update_data.pop('tag_names'), update_data.get('tag_color'), owner_id=owner_id)
            publication.tags = tags

        if 'inline_keyboard' in update_data:
            inline_keyboard_value = update_data['inline_keyboard']
            if inline_keyboard_value:
                update_data['inline_keyboard'] = (
                    inline_keyboard_value.model_dump()
                    if hasattr(inline_keyboard_value, 'model_dump')
                    else inline_keyboard_value
                )
            else:
                update_data['inline_keyboard'] = None

        if 'poll_data' in update_data:
            poll_value = update_data['poll_data']
            if poll_value:
                update_data['poll_data'] = (
                    poll_value.model_dump()
                    if hasattr(poll_value, 'model_dump')
                    else poll_value
                )
            else:
                update_data['poll_data'] = None

        auto_delete_delay_seconds = update_data.pop(
            'auto_delete_delay_seconds', None)
        if auto_delete_delay_seconds is not None:
            update_data['auto_delete_seconds'] = auto_delete_delay_seconds
        elif 'auto_delete_hours' in update_data:
            hours_value = update_data['auto_delete_hours']
            update_data['auto_delete_seconds'] = hours_value * \
                3600 if hours_value is not None else None

        if 'content_type' in update_data:
            update_data['content_type'] = DBContentType[update_data['content_type'].value.upper()]

        if 'status' in update_data:
            update_data['status'] = DBPublicationStatus[update_data['status'].value.upper()]

        if 'repeat_custom_unit' in update_data:
            unit_value = update_data['repeat_custom_unit']
            update_data['repeat_custom_unit'] = unit_value.value if hasattr(unit_value, 'value') else unit_value

        for key, value in update_data.items():
            setattr(publication, key, value)

        publication.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(publication)

        return publication

    async def delete_publication(self, publication_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить публикацию"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return False

        await self.db.delete(publication)
        await self.db.commit()
        return True

    async def get_channels_by_ids(
        self,
        channel_ids: List[int],
        owner_id: Optional[int] = None
    ) -> List[Channel]:
        """Получить каналы по ID"""
        query = select(Channel).options(selectinload(
            Channel.bot)).where(Channel.id.in_(channel_ids))
        if owner_id is not None:
            query = query.where(Channel.owner_id == owner_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_or_create_tags(self, tag_names: List[str], tag_color: Optional[str] = None, owner_id: Optional[int] = None) -> List[Tag]:
        """Получить или создать теги"""
        from datetime import datetime, timezone

        query = select(Tag).where(Tag.name.in_(tag_names))
        if owner_id is not None:
            query = query.where(Tag.owner_id == owner_id)
        result = await self.db.execute(query)
        existing_tags = {tag.name: tag for tag in result.scalars().all()}

        tags = []
        new_tags = []
        now = datetime.now(timezone.utc)

        for name in tag_names:
            if name in existing_tags:
                tag = existing_tags[name]
                if tag_color and tag.color != tag_color:
                    tag.color = tag_color
                tag.last_used_at = now
                tags.append(tag)
            else:
                new_tag = Tag(name=name, color=tag_color, last_used_at=now, owner_id=owner_id)
                new_tags.append(new_tag)
                tags.append(new_tag)

        if new_tags:
            self.db.add_all(new_tags)
            try:
                await self.db.flush()
            except IntegrityError:
                await self.db.rollback()
                query = select(Tag).where(Tag.name.in_(tag_names))
                result = await self.db.execute(query)
                existing_tags = {
                    tag.name: tag for tag in result.scalars().all()}
                tags = [existing_tags[name] for name in tag_names]
                for tag in tags:
                    tag.last_used_at = now

        return tags

    async def create_notification(
        self,
        publication_id: int,
        status: str,
        message: str,
        error_details: Optional[Dict] = None
    ):
        """Создать уведомление о публикации"""
        notification = PublicationNotification(
            publication_id=publication_id,
            status=status,
            message=message,
            error_details=error_details
        )
        self.db.add(notification)
        await self.db.flush()

    async def create_series(
        self,
        name: str,
        description: Optional[str] = None,
        reply_to_previous: bool = True
    ) -> PublicationSeries:
        """Создать серию публикаций"""
        series = PublicationSeries(
            name=name,
            description=description,
            reply_to_previous=reply_to_previous
        )
        self.db.add(series)
        await self.db.commit()
        await self.db.refresh(series)
        return series

    async def reschedule_publication(
        self,
        publication_id: int,
        new_time: datetime,
        owner_id: Optional[int] = None
    ) -> Optional[Publication]:
        """Перенести публикацию на другое время"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return None

        publication.scheduled_time = new_time
        publication.status = DBPublicationStatus.SCHEDULED
        await self.db.commit()
        await self.db.refresh(publication)

        return publication

    async def get_calendar(
        self,
        year: int,
        month: int,
        owner_id: Optional[int] = None
    ) -> List[Publication]:
        """Получить публикации за месяц для календаря"""
        import pytz
        start_date = datetime(year, month, 1, tzinfo=pytz.UTC)

        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=pytz.UTC)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=pytz.UTC)

        query = select(Publication).where(
            and_(
                Publication.scheduled_time >= start_date,
                Publication.scheduled_time < end_date,
                Publication.status.in_(
                    [DBPublicationStatus.SCHEDULED, DBPublicationStatus.PUBLISHED])
            )
        ).options(
            selectinload(Publication.channels),
            selectinload(Publication.tags)
        ).order_by(Publication.scheduled_time)

        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_text_template(
        self,
        user_id: int,
        data: TextTemplateCreate
    ) -> TextTemplate:
        """Создать новый текстовый шаблон"""
        template = TextTemplate(
            owner_id=user_id,
            name=data.name,
            formatted_content=data.formatted_content
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def get_text_templates(
        self,
        user_id: int,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[TextTemplate], int]:
        """Получить список шаблонов пользователя с пагинацией"""
        query = select(TextTemplate).where(TextTemplate.owner_id == user_id)
        
        if search:
            query = query.where(TextTemplate.name.ilike(f"%{search}%"))
        
        count_query = select(TextTemplate.id).where(TextTemplate.owner_id == user_id)
        if search:
            count_query = count_query.where(TextTemplate.name.ilike(f"%{search}%"))
        
        total_result = await self.db.execute(count_query)
        total = len(total_result.all())
        
        query = query.order_by(TextTemplate.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        templates = result.scalars().all()
        
        return list(templates), total

    async def get_text_template_by_id(
        self,
        template_id: int,
        user_id: int
    ) -> Optional[TextTemplate]:
        """Получить шаблон по ID"""
        query = select(TextTemplate).where(
            and_(
                TextTemplate.id == template_id,
                TextTemplate.owner_id == user_id
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_text_template(
        self,
        template_id: int,
        user_id: int,
        data: TextTemplateUpdate
    ) -> Optional[TextTemplate]:
        """Обновить текстовый шаблон"""
        template = await self.get_text_template_by_id(template_id, user_id)
        if not template:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)
        
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def delete_text_template(
        self,
        template_id: int,
        user_id: int
    ) -> bool:
        """Удалить текстовый шаблон"""
        template = await self.get_text_template_by_id(template_id, user_id)
        if not template:
            return False
        
        await self.db.delete(template)
        await self.db.commit()
        return True
