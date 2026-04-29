"""Бот-сообщения календаря (info-сообщения + автоматические рассылки) в диапазоне."""

from datetime import datetime
from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, BotMessage
from backend.schemas.publications.publications import BotMessageCompact


class GetBotMessagesInRange:
    """Собирает только разрешённые источники: INFO_MESSAGE и AUTOMATION_BROADCAST."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> List[BotMessageCompact]:
        results: List[BotMessageCompact] = []
        results.extend(await self.fetch_info_messages(owner_id, start_date, end_date))
        results.extend(await self.fetch_broadcast_groups(owner_id, start_date, end_date))
        results.sort(key=lambda m: m.sent_at)
        return results

    async def fetch_info_messages(
        self, owner_id: int, start_date: datetime, end_date: datetime,
    ) -> List[BotMessageCompact]:
        """INFO_MESSAGE: каждое сообщение отдельно (1 чат на запись)."""
        query = (
            select(
                BotMessage.id.label("msg_id"),
                BotMessage.text_content,
                BotMessage.media_url,
                Bot.username.label("bot_username"),
                BotMessage.created_at.label("sent_at"),
            )
            .select_from(BotMessage)
            .join(Bot, Bot.id == BotMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                BotMessage.is_incoming.is_(False),
                BotMessage.is_system.is_(False),
                BotMessage.created_at >= start_date,
                BotMessage.created_at <= end_date,
                BotMessage.raw_data["calendar_source"].as_string() == "INFO_MESSAGE",
            )
            .order_by(BotMessage.created_at.asc(), BotMessage.id.asc())
        )
        rows = (await self.db.execute(query)).all()
        return [
            BotMessageCompact(
                id=row.msg_id,
                name=(row.text_content or "")[:50],
                text_content=row.text_content,
                media_url=row.media_url,
                bot_username=row.bot_username,
                sent_at=row.sent_at,
                total_chats=1,
                success_chats=1,
            )
            for row in rows
        ]

    async def fetch_broadcast_groups(
        self, owner_id: int, start_date: datetime, end_date: datetime,
    ) -> List[BotMessageCompact]:
        """AUTOMATION_BROADCAST: группируем по тексту/медиа/боту/дню → 1 запись на рассылку."""
        query = (
            select(
                func.min(BotMessage.id).label("msg_id"),
                BotMessage.text_content,
                BotMessage.media_url,
                Bot.username.label("bot_username"),
                func.min(BotMessage.created_at).label("first_sent_at"),
                func.count().label("total_chats"),
            )
            .select_from(BotMessage)
            .join(Bot, Bot.id == BotMessage.bot_id)
            .where(
                Bot.owner_id == owner_id,
                BotMessage.is_incoming.is_(False),
                BotMessage.is_system.is_(False),
                BotMessage.created_at >= start_date,
                BotMessage.created_at <= end_date,
                BotMessage.raw_data["calendar_source"].as_string() == "AUTOMATION_BROADCAST",
            )
            .group_by(
                Bot.id,
                BotMessage.text_content,
                BotMessage.media_url,
                Bot.username,
                func.date(BotMessage.created_at),
            )
            .order_by(func.min(BotMessage.created_at).asc())
        )
        rows = (await self.db.execute(query)).all()
        return [
            BotMessageCompact(
                id=row.msg_id,
                name=(row.text_content or "")[:50],
                text_content=row.text_content,
                media_url=row.media_url,
                bot_username=row.bot_username,
                sent_at=row.first_sent_at,
                total_chats=row.total_chats,
                success_chats=row.total_chats,
            )
            for row in rows
        ]
