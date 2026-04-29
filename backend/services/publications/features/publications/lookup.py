"""Поиск публикаций и каналов пользователя — общие хелперы."""

from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication, TelegramMessage


async def get_publication(
    db: AsyncSession,
    publication_id: int,
    owner_id: Optional[int] = None,
) -> Optional[Publication]:
    """Полная подгрузка публикации (channels + bots, tags, series, telegram_messages)."""
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
    return (await db.execute(query)).scalar_one_or_none()


async def find_publication_or_404(
    db: AsyncSession,
    publication_id: int,
    owner_id: Optional[int] = None,
) -> Publication:
    """Возвращает публикацию или 404."""
    publication = await get_publication(db, publication_id, owner_id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


async def find_owned_channels(
    db: AsyncSession,
    channel_ids: List[int],
    owner_id: int,
) -> List[Channel]:
    """Каналы пользователя по списку id (с подгрузкой бота)."""
    query = (
        select(Channel)
        .options(selectinload(Channel.bot))
        .where(Channel.id.in_(channel_ids), Channel.owner_id == owner_id)
    )
    return list((await db.execute(query)).scalars().all())
