"""Постраничный список автоответов с поиском по ключевым словам."""

from typing import List, Optional, Tuple

from sqlalchemy import Text, cast, func, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReply, Bot as BotModel


class ListAutoReplies:
    """Список автоответов бота с фильтрами + total."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        channel_id: Optional[int] = None,
    ) -> Tuple[List[AutoReply], int]:
        query = build_filtered_query(
            bot_id=bot_id, owner_id=owner_id, channel_id=channel_id,
            is_active=is_active, search=search,
        )

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        rows = (await self.db.execute(
            query.order_by(AutoReply.created_at.desc()).offset(skip).limit(limit)
        )).scalars().all()
        return list(rows), total


def build_filtered_query(
    bot_id: int,
    owner_id: Optional[int],
    channel_id: Optional[int],
    is_active: Optional[bool],
    search: Optional[str],
):
    """SELECT с применёнными фильтрами (без сортировки/пагинации)."""
    query = select(AutoReply).where(AutoReply.bot_id == bot_id)
    if owner_id is not None:
        query = query.join(BotModel, AutoReply.bot_id == BotModel.id).where(
            BotModel.owner_id == owner_id,
        )
    if channel_id is not None:
        query = query.where(AutoReply.channel_id == channel_id)
    if is_active is not None:
        query = query.where(AutoReply.is_active == is_active)
    if search:
        query = query.where(
            cast(cast(AutoReply.keywords, JSONB), Text).ilike(f"%{search}%")
        )
    return query
