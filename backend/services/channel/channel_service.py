from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException

from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup, ChannelType, BackupMode
from backend.schemas.channels import ChannelGroupCreate, ChannelGroupUpdate


class ChannelService:
    """CRUD операции с каналами."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ChannelGroupCreate, owner_id: int) -> ChannelGroup:
        """Создать канал с проверкой на дубликат."""
        query = select(ChannelGroup).where(
            ChannelGroup.telegram_id == data.telegram_id,
            ChannelGroup.owner_id == owner_id,
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        channel = ChannelGroup(
            owner_id=owner_id,
            telegram_id=data.telegram_id,
            channel_type=data.channel_type,
            title=data.title,
            username=data.username,
            description=data.description,
            is_active=True,
        )
        self.db.add(channel)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def get(self, channel_id: int, owner_id: Optional[int] = None) -> ChannelGroup:
        """Получить канал по ID."""
        query = select(ChannelGroup).options(selectinload(ChannelGroup.bot)).where(
            ChannelGroup.id == channel_id,
        )
        if owner_id is not None:
            query = query.where(ChannelGroup.owner_id == owner_id)
        result = await self.db.execute(query)
        channel = result.scalar_one_or_none()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel

    async def get_by_telegram_id(self, telegram_id: int) -> ChannelGroup:
        """Получить канал по Telegram ID."""
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_id)
        result = await self.db.execute(query)
        channel = result.scalar_one_or_none()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel

    async def list(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        channel_type: Optional[ChannelType] = None,
        is_active: Optional[bool] = None,
        backup_mode: Optional[BackupMode] = None,
    ) -> tuple[List[ChannelGroup], int]:
        """Список каналов с фильтрацией."""
        query = select(ChannelGroup).where(ChannelGroup.owner_id == owner_id)
        count_query = select(func.count(distinct(ChannelGroup.id))).where(
            ChannelGroup.owner_id == owner_id,
        )

        if channel_type:
            query = query.where(ChannelGroup.channel_type == channel_type)
            count_query = count_query.where(ChannelGroup.channel_type == channel_type)
        if is_active is not None:
            query = query.where(ChannelGroup.is_active == is_active)
            count_query = count_query.where(ChannelGroup.is_active == is_active)
        if backup_mode:
            query = query.where(ChannelGroup.backup_mode == backup_mode)
            count_query = count_query.where(ChannelGroup.backup_mode == backup_mode)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(ChannelGroup.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        channels = list(result.scalars().all())

        return channels, total

    async def update(self, channel_id: int, data: ChannelGroupUpdate, owner_id: int) -> ChannelGroup:
        """Обновить канал."""
        channel = await self.get(channel_id, owner_id=owner_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(channel, field, value)

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def delete(self, channel_id: int, owner_id: int) -> bool:
        """Удалить канал."""
        channel = await self.get(channel_id, owner_id=owner_id)
        await self.db.delete(channel)
        await self.db.flush()
        return True
