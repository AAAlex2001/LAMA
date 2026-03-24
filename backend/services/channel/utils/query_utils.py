from typing import Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup


async def get_channel(
    db: AsyncSession,
    channel_id: int,
    owner_id: Optional[int] = None,
    load_bot: bool = False,
    load_auto_delete: bool = False,
) -> Optional[ChannelGroup]:
    """Получить канал по ID."""
    query = select(ChannelGroup).where(ChannelGroup.id == channel_id)
    if owner_id is not None:
        query = query.where(ChannelGroup.owner_id == owner_id)
    if load_bot:
        query = query.options(selectinload(ChannelGroup.bot))
    if load_auto_delete:
        query = query.options(selectinload(ChannelGroup.auto_delete_settings))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_channel_by_telegram_id(
    db: AsyncSession,
    telegram_id: int,
    bot_id: Optional[int] = None,
) -> Optional[ChannelGroup]:
    """Получить канал по Telegram ID или linked_chat_id."""
    query = select(ChannelGroup).where(
        or_(
            ChannelGroup.telegram_id == telegram_id,
            ChannelGroup.linked_chat_id == telegram_id,
        )
    )
    if bot_id is not None:
        query = query.where(ChannelGroup.bot_id == bot_id)
    result = await db.execute(query)
    return result.scalars().first()
