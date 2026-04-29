"""Загрузка страницы BotMessage в трёх режимах: normal / after / around."""

from typing import List, Optional

from sqlalchemy import asc, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from backend.models.bots import BotMessage


async def fetch_messages(
    db: AsyncSession,
    base_filter,
    skip: int,
    limit: int,
    around_message_id: Optional[int],
    after_message_id: Optional[int],
) -> List[BotMessage]:
    """after_message_id > around_message_id > обычная страница."""
    if after_message_id:
        return await fetch_messages_after(db, base_filter, after_message_id, skip, limit)
    if around_message_id:
        return await fetch_messages_around(db, base_filter, around_message_id, skip, limit)
    return await fetch_messages_normal(db, base_filter, skip, limit)


async def fetch_messages_normal(
    db: AsyncSession, base_filter, skip: int, limit: int,
) -> List[BotMessage]:
    """Обычная пагинация по created_at desc."""
    query = (
        base_message_query(base_filter)
        .order_by(desc(BotMessage.created_at))
        .offset(skip)
        .limit(limit)
    )
    return list((await db.execute(query)).scalars().all())


async def fetch_messages_after(
    db: AsyncSession, base_filter, after_message_id: int, skip: int, limit: int,
) -> List[BotMessage]:
    """Только сообщения новее указанного telegram_message_id."""
    target_id = await find_internal_id(db, base_filter, after_message_id)
    if target_id is None:
        return await fetch_messages_normal(db, base_filter, skip, limit)

    query = (
        base_message_query(base_filter)
        .where(BotMessage.id > target_id)
        .order_by(desc(BotMessage.created_at))
        .limit(limit)
    )
    return list((await db.execute(query)).scalars().all())


async def fetch_messages_around(
    db: AsyncSession, base_filter, around_message_id: int, skip: int, limit: int,
) -> List[BotMessage]:
    """half до + half после указанного сообщения (для перехода по reply-ссылке)."""
    target_id = await find_internal_id(db, base_filter, around_message_id)
    if target_id is None:
        return await fetch_messages_normal(db, base_filter, skip, limit)

    half = limit // 2
    before = list((await db.execute(
        base_message_query(base_filter)
        .where(BotMessage.id <= target_id)
        .order_by(desc(BotMessage.id))
        .limit(half + 1)
    )).scalars().all())

    after = list((await db.execute(
        base_message_query(base_filter)
        .where(BotMessage.id > target_id)
        .order_by(asc(BotMessage.id))
        .limit(half)
    )).scalars().all())
    after.reverse()
    return after + before


async def find_internal_id(
    db: AsyncSession, base_filter, telegram_message_id: int,
) -> Optional[int]:
    """BotMessage.id по telegram_message_id; None если не найдено."""
    return (await db.execute(
        select(BotMessage.id).where(
            base_filter, BotMessage.telegram_message_id == telegram_message_id,
        )
    )).scalar_one_or_none()


def base_message_query(base_filter):
    """SELECT BotMessage без raw_data (для скорости)."""
    return select(BotMessage).where(base_filter).options(defer(BotMessage.raw_data))
