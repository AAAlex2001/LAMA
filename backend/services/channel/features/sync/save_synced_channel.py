from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.features.forum_topics.list_topics import ensure_general_topic
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id


class SaveSyncedChannel:
    """Создаёт или обновляет ChannelGroup по результатам синхронизации."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, telegram_id: int, chat_data: dict, bot_id: int, owner_id: int,
    ) -> ChannelGroup:
        """Бросает 403 если канал уже есть и принадлежит другому пользователю."""
        existing = await get_channel_by_telegram_id(self.db, telegram_id)
        now = datetime.now(timezone.utc)

        if existing:
            if existing.owner_id != owner_id:
                raise HTTPException(status_code=403, detail="Channel belongs to another user")
            for field, value in chat_data.items():
                setattr(existing, field, value)
            existing.bot_id = bot_id
            existing.last_sync_at = now
            existing.updated_at = now
            channel = existing
        else:
            channel = ChannelGroup(
                owner_id=owner_id,
                bot_id=bot_id,
                telegram_id=telegram_id,
                last_sync_at=now,
                is_active=True,
                **chat_data,
            )
            self.db.add(channel)

        await self.db.flush()
        await self.db.refresh(channel)

        if channel.is_forum:
            await ensure_general_topic(self.db, channel.id)

        return channel
