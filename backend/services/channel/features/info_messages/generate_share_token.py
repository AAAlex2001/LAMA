import secrets

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel.features.info_messages.lookup import (
    find_channel_or_404,
    find_info_message_or_404,
)


class GenerateShareToken:
    """Создаёт публичный токен для шаринга информационного сообщения."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, message_id: int, owner_id: int) -> str:
        await find_channel_or_404(self.db, channel_id, owner_id)
        msg = await find_info_message_or_404(self.db, channel_id, message_id)
        token = secrets.token_urlsafe(32)
        msg.share_token = token
        await self.db.flush()
        return token
