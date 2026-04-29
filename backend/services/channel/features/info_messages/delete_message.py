from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel.features.info_messages.lookup import (
    find_channel_or_404,
    find_info_message_or_404,
)


class DeleteInfoMessage:
    """Удаляет информационное сообщение канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, message_id: int, owner_id: int) -> None:
        await find_channel_or_404(self.db, channel_id, owner_id)
        msg = await find_info_message_or_404(self.db, channel_id, message_id)
        await self.db.delete(msg)
        await self.db.flush()
