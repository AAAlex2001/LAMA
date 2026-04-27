"""Поиск серии публикаций — общие хелперы."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.publications import Publication, PublicationSeries, TelegramMessage


async def get_series(db: AsyncSession, series_id: int) -> Optional[PublicationSeries]:
    """Серия + все её публикации с telegram-сообщениями и каналами."""
    query = (
        select(PublicationSeries)
        .where(PublicationSeries.id == series_id)
        .options(
            selectinload(PublicationSeries.publications)
            .selectinload(Publication.telegram_messages)
            .selectinload(TelegramMessage.channel)
        )
    )
    return (await db.execute(query)).scalar_one_or_none()


async def find_series_or_404(db: AsyncSession, series_id: int) -> PublicationSeries:
    """Серия или 404."""
    series = await get_series(db, series_id)
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series
