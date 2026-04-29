from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel.utils.query_utils import find_channel_or_404


class DeleteChannel:
    """Удаляет канал пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> None:
        channel = await find_channel_or_404(self.db, channel_id, owner_id=owner_id)
        await self.db.delete(channel)
        await self.db.flush()
