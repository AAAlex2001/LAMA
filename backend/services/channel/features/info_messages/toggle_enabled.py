from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel.features.info_messages.lookup import find_channel_or_404


class ToggleInfoMessages:
    """Включает/выключает показ информационных сообщений."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, enabled: bool, owner_id: int) -> None:
        channel = await find_channel_or_404(self.db, channel_id, owner_id)
        channel.info_messages_enabled = enabled
        await self.db.flush()
