from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelAutoDeleteSettings, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


async def ensure_auto_delete_settings(
    db: AsyncSession,
    channel: ChannelGroup,
) -> ChannelAutoDeleteSettings:
    """Атомарно создаёт настройки автоудаления канала или возвращает существующие.

    Использует ``INSERT ... ON CONFLICT DO NOTHING`` по уникальному ``channel_id``,
    что исключает race condition между двумя параллельными запросами.
    """
    if channel.auto_delete_settings:
        return channel.auto_delete_settings

    statement = pg_insert(ChannelAutoDeleteSettings).values(
        channel_id=channel.id,
        delete_system_messages=False,
        delete_command_messages=False,
    ).on_conflict_do_nothing(index_elements=["channel_id"]).returning(ChannelAutoDeleteSettings)

    inserted = (await db.execute(statement)).scalar_one_or_none()
    if inserted is not None:
        await db.flush()
        return inserted

    return (await db.execute(
        select(ChannelAutoDeleteSettings)
        .where(ChannelAutoDeleteSettings.channel_id == channel.id)
    )).scalar_one()


class GetAutoDeleteSettings:
    """Возвращает настройки автоудаления канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> ChannelAutoDeleteSettings:
        """Возвращает настройки. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id, load_auto_delete=True)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")
        return await ensure_auto_delete_settings(self.db, channel)
