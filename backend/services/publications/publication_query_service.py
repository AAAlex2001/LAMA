from datetime import date, datetime
from types import SimpleNamespace
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import and_, case, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, load_only

from backend.models.channels import ChannelGroup as Channel
from backend.models.bots import Bot, BotMessage, RecurringMessage, RecurringMessageLog
from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
    Tag,
    TelegramMessage,
    publication_channels,
    publication_tags,
)
from backend.schemas.publications.enums import ContentType, PublicationStatus
from backend.schemas.publications.publication_response import (
    BotMessageCompact,
    WeekBatchDay,
    WeekBatchResponse,
)
from backend.services.publications.repeat_utils import strip_tz, project_repeat_occurrences

PUB_COMPACT_COLUMNS = [
    Publication.id,
    Publication.status,
    Publication.content_type,
    Publication.text_content,
    Publication.formatted_content,
    Publication.media_urls,
    Publication.media_thumbnail_urls,
    Publication.media_file_ids,
    Publication.media_blur,
    Publication.inline_keyboard,
    Publication.poll_data,
    Publication.repeat_interval,
    Publication.scheduled_time,
    Publication.published_time,
    Publication.created_at,
    Publication.updated_at,
    Publication.owner_id,
]

REPEAT_EXTRA_COLUMNS = [
    Publication.next_repeat_time,
    Publication.repeat_custom_days,
    Publication.repeat_custom_hours,
    Publication.repeat_end_time,
    Publication.repeat_custom_unit,
    Publication.repeat_custom_value,
    Publication.repeat_weekdays,
    Publication.repeat_month_days,
    Publication.repeat_year_month,
    Publication.repeat_year_days,
]

CHANNEL_COMPACT_COLUMNS = [
    Channel.id,
    Channel.title,
    Channel.members_count,
    Channel.photo_url,
]

TAG_COMPACT_COLUMNS = [
    Tag.id,
    Tag.name,
    Tag.color,
]


def escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def make_scheduled_projection(pub: Publication, projected_time: datetime) -> SimpleNamespace:
    """Создаёт копию публикации со статусом SCHEDULED и проецированным scheduled_time для будущих повторов."""
    proxy = SimpleNamespace()
    for col in PUB_COMPACT_COLUMNS:
        setattr(proxy, col.key, getattr(pub, col.key))
    proxy.status = DBPublicationStatus.SCHEDULED
    proxy.scheduled_time = projected_time
    proxy.channels = pub.channels
    proxy.tags = pub.tags
    return proxy


class PublicationQueryService:
    """Read operations for publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None) -> Optional[Publication]:
        query = (
            select(Publication)
            .where(Publication.id == publication_id)
            .options(
                selectinload(Publication.channels).selectinload(Channel.bot),
                selectinload(Publication.tags),
                selectinload(Publication.series),
                selectinload(Publication.telegram_messages)
                .selectinload(TelegramMessage.channel)
                .selectinload(Channel.bot),
            )
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_publication_or_404(self, publication_id: int, owner_id: Optional[int] = None) -> Publication:
        publication = await self.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        return publication

    async def get_publications_compact(
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
        date_mode: Optional[str] = "scheduled",
        skip: int = 0,
        limit: int = 100,
    ) -> List[Publication]:
        """Lightweight query: loads only channels and tags (no bot, no series)."""
        skip = max(0, skip)
        limit = min(max(1, limit), 500)

        query = select(Publication)
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

        query = self.apply_filters(
            query, status, content_type, channel_id, tag_names, tag_ids,
            series_id, start_date, end_date, search, owner_id, date_mode,
        )

        normalized_mode = (date_mode or "scheduled").lower()
        primary_date = Publication.published_time if normalized_mode == "published" else Publication.scheduled_time
        order_asc = (sort_order or "").lower() == "asc"
        order_expr = primary_date.asc() if order_asc else primary_date.desc()
        id_tie = Publication.id.asc() if order_asc else Publication.id.desc()

        query = (
            query
            .options(
                load_only(*PUB_COMPACT_COLUMNS),
                selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
                selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
            )
            .order_by(order_expr, id_tie)
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(query)
        posts = list(result.scalars().all())

        if start_date and end_date and owner_id:
            posts = await self.merge_repeating(posts, start_date, end_date, owner_id)

        return posts

    async def merge_repeating(
        self,
        posts: List[Publication],
        start_date: datetime,
        end_date: datetime,
        owner_id: int,
    ) -> List[Publication]:
        """Подтягивает повторяющиеся посты, проецирующиеся на диапазон."""
        existing_ids = {p.id for p in posts}

        query = (
            select(Publication)
            .where(
                Publication.owner_id == owner_id,
                Publication.repeat_interval != DBRepeatInterval.NEVER,
                Publication.status.in_([
                    DBPublicationStatus.PUBLISHED,
                    DBPublicationStatus.PARTIAL_SUCCESS,
                ]),
                Publication.next_repeat_time.isnot(None),
                Publication.id.notin_(existing_ids) if existing_ids else True,
            )
            .options(
                load_only(*PUB_COMPACT_COLUMNS, *REPEAT_EXTRA_COLUMNS),
                selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
                selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
            )
        )
        result = await self.db.execute(query)
        repeating_pubs = list(result.scalars().all())

        today = date.today()

        for pub in repeating_pubs:
            for _, projected_time in project_repeat_occurrences(pub, start_date, end_date):
                if projected_time.date() > today:
                    posts.append(make_scheduled_projection(pub, projected_time))
                else:
                    posts.append(pub)
                break

        return posts

    async def get_week_batch(
        self,
        owner_id: int,
        start_date: datetime,
        end_date: datetime,
        per_day: int = 20,
    ) -> WeekBatchResponse:
        """One query for all days in range, results bucketed by day."""

        query = (
            select(Publication)
            .where(
                Publication.owner_id == owner_id,
                Publication.scheduled_time >= start_date,
                Publication.scheduled_time <= end_date,
                Publication.status.notin_([DBPublicationStatus.DELETED]),
            )
            .options(
                load_only(*PUB_COMPACT_COLUMNS),
                selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
                selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
            )
            .order_by(Publication.scheduled_time.asc(), Publication.id.asc())
        )
        result = await self.db.execute(query)
        all_posts = list(result.scalars().all())

        buckets: dict[str, list[Publication]] = {}
        day_post_ids: dict[str, set[int]] = {}
        for post in all_posts:
            if post.scheduled_time:
                day_key = strip_tz(post.scheduled_time).strftime("%Y-%m-%d")
                buckets.setdefault(day_key, []).append(post)
                day_post_ids.setdefault(day_key, set()).add(post.id)

        repeat_query = (
            select(Publication)
            .where(
                Publication.owner_id == owner_id,
                Publication.repeat_interval != DBRepeatInterval.NEVER,
                Publication.status.in_([
                    DBPublicationStatus.PUBLISHED,
                    DBPublicationStatus.PARTIAL_SUCCESS,
                ]),
                Publication.next_repeat_time.isnot(None),
            )
            .options(
                load_only(*PUB_COMPACT_COLUMNS, *REPEAT_EXTRA_COLUMNS),
                selectinload(Publication.channels).load_only(*CHANNEL_COMPACT_COLUMNS),
                selectinload(Publication.tags).load_only(*TAG_COMPACT_COLUMNS),
            )
            .limit(200)
        )
        repeat_result = await self.db.execute(repeat_query)
        repeating_pubs = list(repeat_result.scalars().all())

        today = date.today()
        for pub in repeating_pubs:
            for day_key, projected_time in project_repeat_occurrences(pub, start_date, end_date):
                if pub.id not in day_post_ids.get(day_key, set()):
                    item = make_scheduled_projection(pub, projected_time) if projected_time.date() > today else pub
                    buckets.setdefault(day_key, []).append(item)
                    day_post_ids.setdefault(day_key, set()).add(pub.id)

        bot_messages = await self.get_bot_messages_in_range(owner_id, start_date, end_date)
        bot_buckets: dict[str, list[BotMessageCompact]] = {}
        for msg in bot_messages:
            day_key = strip_tz(msg.sent_at).strftime("%Y-%m-%d")
            bot_buckets.setdefault(day_key, []).append(msg)

        all_day_keys = set(buckets.keys()) | set(bot_buckets.keys())
        days: dict[str, WeekBatchDay] = {}
        for day_key in all_day_keys:
            posts = buckets.get(day_key, [])
            posts.sort(
                key=lambda p: strip_tz(getattr(p, "scheduled_time", None) or datetime.min),
                reverse=True,
            )
            bots = bot_buckets.get(day_key, [])
            days[day_key] = WeekBatchDay(
                items=posts[:per_day],
                has_more=len(posts) > per_day,
                bot_messages=bots,
                total=len(posts) + len(bots),
            )
        return WeekBatchResponse(days=days)

    async def get_bot_messages_in_range(
        self,
        owner_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> List[BotMessageCompact]:
        """Собирает бот-сообщения из двух источников: массовые рассылки и повторяющиеся сообщения."""
        results: List[BotMessageCompact] = []

        broadcast_query = (
            select(
                func.min(BotMessage.id).label('msg_id'),
                BotMessage.text_content,
                BotMessage.media_url,
                Bot.username.label('bot_username'),
                func.min(BotMessage.created_at).label('first_sent_at'),
                func.count().label('total_chats'),
            )
            .select_from(BotMessage)
            .join(Bot, Bot.id == BotMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                BotMessage.is_incoming.is_(False),
                BotMessage.is_system.is_(False),
                BotMessage.created_at >= start_date,
                BotMessage.created_at <= end_date,
            )
            .group_by(
                Bot.id,
                BotMessage.text_content,
                BotMessage.media_url,
                Bot.username,
                func.date(BotMessage.created_at),
            )
            .having(func.count() > 1)
            .order_by(func.min(BotMessage.created_at).asc())
        )
        broadcast_result = await self.db.execute(broadcast_query)
        for row in broadcast_result.all():
            results.append(BotMessageCompact(
                id=row.msg_id,
                name=(row.text_content or '')[:50],
                text_content=row.text_content,
                media_url=row.media_url,
                bot_username=row.bot_username,
                sent_at=row.first_sent_at,
                total_chats=row.total_chats,
                success_chats=row.total_chats,
            ))

        recurring_query = (
            select(
                RecurringMessage.id.label('recurring_message_id'),
                RecurringMessage.name,
                RecurringMessage.text_content,
                RecurringMessage.media_url,
                Bot.username.label('bot_username'),
                func.date(RecurringMessageLog.sent_at).label('send_date'),
                func.min(RecurringMessageLog.sent_at).label('first_sent_at'),
                func.count().label('total_chats'),
                func.sum(case((RecurringMessageLog.success.is_(True), 1), else_=0)).label('success_chats'),
            )
            .select_from(RecurringMessageLog)
            .join(RecurringMessage, RecurringMessage.id == RecurringMessageLog.recurring_message_id)
            .join(Bot, Bot.id == RecurringMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                RecurringMessageLog.sent_at >= start_date,
                RecurringMessageLog.sent_at <= end_date,
            )
            .group_by(
                RecurringMessage.id,
                RecurringMessage.name,
                RecurringMessage.text_content,
                RecurringMessage.media_url,
                Bot.username,
                func.date(RecurringMessageLog.sent_at),
            )
            .order_by(func.min(RecurringMessageLog.sent_at).asc())
        )
        recurring_result = await self.db.execute(recurring_query)
        for row in recurring_result.all():
            results.append(BotMessageCompact(
                id=row.recurring_message_id + 10000000,
                name=row.name,
                text_content=row.text_content,
                media_url=row.media_url,
                bot_username=row.bot_username,
                sent_at=row.first_sent_at,
                total_chats=row.total_chats,
                success_chats=row.success_chats,
            ))

        results.sort(key=lambda m: m.sent_at)
        return results

    def apply_filters(self, id_query, status, content_type, channel_id,
                       tag_names, tag_ids, series_id, start_date, end_date,
                       search, owner_id, date_mode: Optional[str] = "scheduled"):
        filters = []
        normalized_mode = (date_mode or "scheduled").lower()
        date_field = Publication.published_time if normalized_mode == "published" else Publication.scheduled_time

        if status:
            filters.append(Publication.status == DBPublicationStatus[status.value.upper()])
        elif normalized_mode == "published":
            filters.append(
                Publication.status.in_([
                    DBPublicationStatus.PUBLISHED,
                    DBPublicationStatus.PARTIAL_SUCCESS,
                ])
            )
        if content_type:
            filters.append(Publication.content_type == DBContentType[content_type.value.upper()])
        if series_id:
            filters.append(Publication.series_id == series_id)
        if start_date:
            filters.append(date_field >= start_date)
        if end_date:
            filters.append(date_field <= end_date)
        if filters:
            id_query = id_query.where(and_(*filters))

        if channel_id:
            id_query = id_query.where(
                exists(
                    select(1).select_from(publication_channels).where(
                        publication_channels.c.publication_id == Publication.id,
                        publication_channels.c.channel_id == channel_id,
                    )
                )
            )

        if tag_ids:
            id_query = id_query.where(
                exists(
                    select(1).select_from(publication_tags).where(
                        publication_tags.c.publication_id == Publication.id,
                        publication_tags.c.tag_id.in_(tag_ids),
                    )
                )
            )
        elif tag_names:
            tag_sub = (
                select(1)
                .select_from(publication_tags.join(Tag, Tag.id == publication_tags.c.tag_id))
                .where(publication_tags.c.publication_id == Publication.id, Tag.name.in_(tag_names))
            )
            if owner_id is not None:
                tag_sub = tag_sub.where(Tag.owner_id == owner_id)
            id_query = id_query.where(exists(tag_sub))

        if search:
            text = search.strip()
            if text:
                id_query = id_query.where(Publication.text_content.ilike(f"%{escape_like(text)}%"))

        return id_query
