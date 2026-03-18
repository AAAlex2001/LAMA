from datetime import datetime, timedelta
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.models.bots import Bot, BotMessage, RecurringMessage, RecurringMessageLog
from backend.schemas.publications.publication_response import DayCount
from backend.services.publications.repeat_calculator import calculate_next_repeat_time


class CalendarService:
    """Запросы для календаря и подсчётов по дням."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_day_counts(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: Optional[int] = None,
        mode: str = "scheduled",
    ) -> List[DayCount]:
        """Считает публикации, повторы и бот-сообщения по дням."""
        normalized_mode = (mode or "scheduled").lower()

        if normalized_mode == "published":
            date_field = Publication.published_time
            status_filter = Publication.status.in_(
                [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
            )
        else:
            date_field = Publication.scheduled_time
            status_filter = Publication.status.notin_([DBPublicationStatus.DELETED])

        date_expr = func.date(date_field)
        filters = [
            date_field.isnot(None),
            date_field >= start_date,
            date_field <= end_date,
            status_filter,
        ]
        if owner_id is not None:
            filters.insert(0, Publication.owner_id == owner_id)

        published_count = func.count(case(
            (Publication.status.in_([DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]), 1),
        ))
        scheduled_count = func.count(case(
            (Publication.status == DBPublicationStatus.SCHEDULED, 1),
        ))
        draft_count = func.count(case(
            (Publication.status == DBPublicationStatus.DRAFT, 1),
        ))

        query = (
            select(
                date_expr.label("day"),
                func.count().label("cnt"),
                published_count.label("published"),
                scheduled_count.label("scheduled"),
                draft_count.label("draft"),
            )
            .where(and_(*filters))
            .group_by(date_expr)
        )

        result = await self.db.execute(query)
        counts_map: dict[str, DayCount] = {}
        for row in result.all():
            date_str = str(row.day)
            counts_map[date_str] = DayCount(
                date=date_str,
                count=row.cnt,
                published=row.published,
                scheduled=row.scheduled,
                draft=row.draft,
            )

        if owner_id is not None:
            for dc in await self.project_repeats(start_date, end_date, owner_id):
                if dc.date in counts_map:
                    existing = counts_map[dc.date]
                    counts_map[dc.date] = DayCount(
                        date=dc.date,
                        count=existing.count + dc.count,
                        published=existing.published + dc.published,
                        scheduled=existing.scheduled,
                        draft=existing.draft,
                    )
                else:
                    counts_map[dc.date] = dc

            for bc in await self.count_bot_messages_per_day(start_date, end_date, owner_id):
                if bc.date in counts_map:
                    existing = counts_map[bc.date]
                    counts_map[bc.date] = DayCount(
                        date=bc.date,
                        count=existing.count + bc.count,
                        published=existing.published + bc.published,
                        scheduled=existing.scheduled,
                        draft=existing.draft,
                        bot_messages=existing.bot_messages + bc.bot_messages,
                    )
                else:
                    counts_map[bc.date] = bc

        return list(counts_map.values())

    async def count_bot_messages_per_day(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: int,
    ) -> List[DayCount]:
        """Считает бот-сообщения по дням (рассылки + рекурентные логи)."""
        naive_start = strip_tz(start_date)
        naive_end = strip_tz(end_date)

        broadcast_sub = (
            select(
                func.date(BotMessage.created_at).label("day"),
                Bot.id.label("bot_id"),
                BotMessage.text_content,
                BotMessage.media_url,
            )
            .select_from(BotMessage)
            .join(Bot, Bot.id == BotMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                BotMessage.is_incoming.is_(False),
                BotMessage.is_system.is_(False),
                BotMessage.created_at >= naive_start,
                BotMessage.created_at <= naive_end,
            )
            .group_by(
                Bot.id,
                func.date(BotMessage.created_at),
                BotMessage.text_content,
                BotMessage.media_url,
            )
            .having(func.count() > 1)
            .subquery()
        )
        broadcast_query = (
            select(
                broadcast_sub.c.day,
                func.count().label("cnt"),
            )
            .group_by(broadcast_sub.c.day)
        )
        result = await self.db.execute(broadcast_query)
        per_day: dict[str, int] = {}
        for row in result.all():
            per_day[str(row.day)] = row.cnt

        recurring_query = (
            select(
                func.date(RecurringMessageLog.sent_at).label("day"),
                func.count(func.distinct(RecurringMessageLog.recurring_message_id)).label("cnt"),
            )
            .select_from(RecurringMessageLog)
            .join(RecurringMessage, RecurringMessage.id == RecurringMessageLog.recurring_message_id)
            .join(Bot, Bot.id == RecurringMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                RecurringMessageLog.sent_at >= naive_start,
                RecurringMessageLog.sent_at <= naive_end,
            )
            .group_by(func.date(RecurringMessageLog.sent_at))
        )
        result = await self.db.execute(recurring_query)
        for row in result.all():
            date_str = str(row.day)
            per_day[date_str] = per_day.get(date_str, 0) + row.cnt

        return [
            DayCount(date=date_str, count=cnt, published=cnt, bot_messages=cnt)
            for date_str, cnt in per_day.items()
        ]

    async def project_repeats(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: int,
    ) -> List[DayCount]:
        """Проецирует будущие повторы на даты в диапазоне."""
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
            )
            .options(load_only(
                Publication.id,
                Publication.next_repeat_time,
                Publication.repeat_interval,
                Publication.repeat_custom_days,
                Publication.repeat_custom_hours,
                Publication.repeat_end_time,
                Publication.repeat_custom_unit,
                Publication.repeat_custom_value,
                Publication.repeat_weekdays,
                Publication.repeat_month_days,
                Publication.repeat_year_month,
                Publication.repeat_year_days,
            ))
        )
        result = await self.db.execute(query)
        repeating_pubs = result.scalars().all()

        per_day: dict[str, int] = {}
        seen: set = set()
        naive_start = strip_tz(start_date)
        naive_end = strip_tz(end_date)

        for pub in repeating_pubs:
            current = fast_forward_to(
                pub.next_repeat_time, naive_start,
                pub.repeat_interval, pub.repeat_custom_days, pub.repeat_custom_hours,
            )
            if current is None:
                continue

            max_in_range = 200
            iterations = 0

            while current and current <= naive_end and iterations < max_in_range:
                if current >= naive_start:
                    date_str = current.strftime("%Y-%m-%d")
                    key = (pub.id, date_str)
                    if key not in seen:
                        per_day[date_str] = per_day.get(date_str, 0) + 1
                        seen.add(key)

                current = calculate_next_repeat_time(
                    current,
                    pub.repeat_interval,
                    pub.repeat_custom_days,
                    pub.repeat_custom_hours,
                    pub.repeat_end_time,
                    pub.repeat_custom_unit,
                    pub.repeat_custom_value,
                    pub.repeat_weekdays,
                    pub.repeat_month_days,
                    pub.repeat_year_month,
                    pub.repeat_year_days,
                )
                iterations += 1

        return [
            DayCount(date=date_str, count=cnt, published=cnt)
            for date_str, cnt in per_day.items()
        ]


def strip_tz(dt: datetime) -> datetime:
    """Убирает timezone info для безопасного сравнения."""
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def fast_forward_to(
    current: datetime,
    target: datetime,
    interval: DBRepeatInterval,
    custom_days: Optional[int],
    custom_hours: Optional[int],
) -> Optional[datetime]:
    """Прыжок к target без пошаговой итерации."""
    current = strip_tz(current)
    target = strip_tz(target)

    if current >= target:
        return current

    diff = target - current

    if interval == DBRepeatInterval.DAILY:
        return current + timedelta(days=diff.days)
    if interval == DBRepeatInterval.WEEKLY:
        return current + timedelta(weeks=diff.days // 7)
    if interval == DBRepeatInterval.BIWEEKLY:
        return current + timedelta(weeks=(diff.days // 14) * 2)
    if interval == DBRepeatInterval.MONTHLY:
        months = (target.year - current.year) * 12 + target.month - current.month
        return current + relativedelta(months=max(0, months - 1))
    if interval == DBRepeatInterval.YEARLY:
        years = target.year - current.year
        return current + relativedelta(years=max(0, years - 1))
    if interval == DBRepeatInterval.CUSTOM:
        days = custom_days or 0
        hours = custom_hours or 0
        step_seconds = days * 86400 + hours * 3600
        if step_seconds > 0:
            jumps = int(diff.total_seconds() // step_seconds)
            return current + timedelta(seconds=jumps * step_seconds)

    return current
