from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackupMode, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


class UpdateBackupMode:
    """Сохраняет режим бэкапа канала и список целевых каналов-приёмников."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        backup_mode: BackupMode,
        backup_target_ids: Optional[List[int]] = None,
        backup_post_types: Optional[List[str]] = None,
        backup_content_types: Optional[List[str]] = None,
        backup_ai_prompt: Optional[str] = None,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал или target не принадлежат пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        if backup_mode == BackupMode.INSTANT and backup_target_ids:
            await self.ensure_targets_owned(backup_target_ids, owner_id)

        channel.backup_mode = backup_mode
        channel.backup_target_ids = backup_target_ids
        channel.backup_target_id = backup_target_ids[0] if backup_target_ids else None
        channel.backup_post_types = backup_post_types
        channel.backup_content_types = backup_content_types
        channel.backup_ai_prompt = backup_ai_prompt
        channel.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def ensure_targets_owned(self, target_ids: List[int], owner_id: int) -> None:
        """Проверяет что все целевые каналы принадлежат пользователю; иначе 404."""
        rows = (await self.db.execute(
            select(ChannelGroup.id).where(
                ChannelGroup.id.in_(target_ids),
                ChannelGroup.owner_id == owner_id,
            )
        )).all()
        owned = {row[0] for row in rows}

        for target_id in target_ids:
            if target_id not in owned:
                raise HTTPException(status_code=404, detail=f"Target channel {target_id} not found")
