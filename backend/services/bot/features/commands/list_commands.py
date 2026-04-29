"""Список команд бота с фильтрами."""

from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotCommand


class ListCommands:
    """Команды бота + total."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        channel_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[BotCommand], int]:
        query = build_filtered_query(bot_id, channel_id, is_active, owner_id)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        rows = (await self.db.execute(
            query.order_by(BotCommand.command)
        )).scalars().all()
        return list(rows), total


def build_filtered_query(
    bot_id: int,
    channel_id: Optional[int],
    is_active: Optional[bool],
    owner_id: Optional[int],
):
    """SELECT с применёнными фильтрами; без сортировки."""
    query = select(BotCommand).where(BotCommand.bot_id == bot_id)
    if owner_id is not None:
        query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
            BotModel.owner_id == owner_id,
        )
    if channel_id is not None:
        query = query.where(BotCommand.channel_id == channel_id)
    if is_active is not None:
        query = query.where(BotCommand.is_active == is_active)
    return query
