"""Список публикаций серии в нужном порядке."""

from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.publications import Publication, TelegramMessage


class GetSeriesPublications:
    """Все публикации серии: либо по series_order, либо по created_at."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, series_id: int, order_by_series_order: bool = True,
    ) -> List[Publication]:
        query = (
            select(Publication)
            .where(Publication.series_id == series_id)
            .options(
                selectinload(Publication.telegram_messages).selectinload(TelegramMessage.channel),
                selectinload(Publication.channels),
            )
        )
        if order_by_series_order:
            query = query.order_by(Publication.series_order.asc())
        else:
            query = query.order_by(Publication.created_at.asc())
        return list((await self.db.execute(query)).scalars().all())
