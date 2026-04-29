from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.schemas.channels.channel import ChannelGroupUpdate
from backend.services.channel.features.crud.cleanup_bot_channel_link import CleanupBotChannelLink
from backend.services.channel.utils.query_utils import find_channel_or_404


class UpdateChannel:
    """Обновляет поля канала; clear_bot=True снимает привязку бота и чистит зависимости."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, channel_id: int, data: ChannelGroupUpdate, owner_id: int,
    ) -> ChannelGroup:
        channel = await find_channel_or_404(self.db, channel_id, owner_id=owner_id, load_bot=True)
        update_data = data.model_dump(exclude_unset=True)

        if update_data.pop("clear_bot", False):
            old_bot_id = channel.bot_id
            old_telegram_id = channel.telegram_id
            channel.bot_id = None
            channel.is_bot_active = True
            if old_bot_id and old_telegram_id:
                await CleanupBotChannelLink(self.db).execute(old_bot_id, old_telegram_id)

        for field, value in update_data.items():
            setattr(channel, field, value)

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
