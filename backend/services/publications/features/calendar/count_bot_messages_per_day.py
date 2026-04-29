"""Подсчёт бот-сообщений по дням только из разрешённых источников календаря."""

from datetime import datetime
from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, BotMessage
from backend.schemas.publications.publication_response import DayCount
from backend.services.publications.utils.repeat_utils import strip_tz


class CountBotMessagesPerDay:
    """INFO_MESSAGE считается каждое; AUTOMATION_BROADCAST — 1 запись на (бот, текст, медиа, день)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        start_date: datetime,
        end_date: datetime,
        owner_id: int,
        tz: str = "UTC",
    ) -> List[DayCount]:
        """Возвращает per-day счётчики (count = published = bot_messages)."""
        naive_start = strip_tz(start_date)
        naive_end = strip_tz(end_date)
        per_day: dict[str, int] = {}

        for day, cnt in await self.count_info_messages(owner_id, naive_start, naive_end, tz):
            per_day[day] = per_day.get(day, 0) + cnt

        for day, cnt in await self.count_broadcasts(owner_id, naive_start, naive_end, tz):
            per_day[day] = per_day.get(day, 0) + cnt

        return [
            DayCount(date=day, count=cnt, published=cnt, bot_messages=cnt)
            for day, cnt in per_day.items()
        ]

    async def count_info_messages(
        self, owner_id: int, naive_start: datetime, naive_end: datetime, tz: str,
    ) -> List[tuple[str, int]]:
        """INFO_MESSAGE: каждое сообщение учитываем отдельно."""
        date_expr = func.date(func.timezone(tz, BotMessage.created_at))
        query = (
            select(date_expr.label("day"), func.count().label("cnt"))
            .select_from(BotMessage)
            .join(Bot, Bot.id == BotMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                BotMessage.is_incoming.is_(False),
                BotMessage.is_system.is_(False),
                BotMessage.created_at >= naive_start,
                BotMessage.created_at <= naive_end,
                BotMessage.raw_data["calendar_source"].as_string() == "INFO_MESSAGE",
            )
            .group_by(date_expr)
        )
        rows = (await self.db.execute(query)).all()
        return [(str(row.day), row.cnt) for row in rows]

    async def count_broadcasts(
        self, owner_id: int, naive_start: datetime, naive_end: datetime, tz: str,
    ) -> List[tuple[str, int]]:
        """AUTOMATION_BROADCAST: группировка (бот, текст, медиа, день) → 1 запись на рассылку."""
        date_expr = func.date(func.timezone(tz, BotMessage.created_at))
        sub = (
            select(
                date_expr.label("day"),
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
                BotMessage.raw_data["calendar_source"].as_string() == "AUTOMATION_BROADCAST",
            )
            .group_by(Bot.id, date_expr, BotMessage.text_content, BotMessage.media_url)
            .subquery()
        )
        query = select(sub.c.day, func.count().label("cnt")).group_by(sub.c.day)
        rows = (await self.db.execute(query)).all()
        return [(str(row.day), row.cnt) for row in rows]
