from typing import Optional

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import BackupMode, ChannelGroup, ChannelType
from backend.services.channel.features.crud.refresh_stale_channels import RefreshStaleChannels


class ListChannels:
    """Постраничный список каналов пользователя с фильтрами."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        channel_type: Optional[ChannelType] = None,
        is_active: Optional[bool] = None,
        backup_mode: Optional[BackupMode] = None,
        force_refresh: bool = False,
    ) -> tuple[list[ChannelGroup], int]:
        """Возвращает (каналы текущей страницы, общее число записей)."""
        filters = [ChannelGroup.owner_id == owner_id]
        if channel_type is not None:
            filters.append(ChannelGroup.channel_type == channel_type)
        if is_active is not None:
            filters.append(ChannelGroup.is_active == is_active)
        if backup_mode is not None:
            filters.append(ChannelGroup.backup_mode == backup_mode)

        total = (await self.db.execute(
            select(func.count(distinct(ChannelGroup.id))).where(*filters)
        )).scalar() or 0

        page_query = (
            select(ChannelGroup)
            .options(selectinload(ChannelGroup.bot))
            .where(*filters)
            .order_by(ChannelGroup.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        channels = list((await self.db.execute(page_query)).scalars().all())

        if force_refresh:
            await RefreshStaleChannels(self.db).execute(channels)

        return channels, total
