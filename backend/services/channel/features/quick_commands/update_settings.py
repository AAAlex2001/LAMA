from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


class UpdateQuickCommands:
    """Сохраняет настройки быстрых команд канала (вкл/выкл + список разрешённых)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        commands_enabled: bool,
        enabled_commands: Optional[List[str]],
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        channel.commands_enabled = commands_enabled
        channel.enabled_commands = enabled_commands
        return channel
