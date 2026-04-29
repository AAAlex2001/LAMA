from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import InformationalMessage
from backend.schemas.channels.info_messages import InfoMessageResponse, InfoMessagesListResponse
from backend.services.channel.features.info_messages.lookup import find_channel_or_404


class ListInfoMessages:
    """Список информационных сообщений канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> InfoMessagesListResponse:
        channel = await find_channel_or_404(self.db, channel_id, owner_id)
        rows = (await self.db.execute(
            select(InformationalMessage)
            .where(InformationalMessage.channel_id == channel_id)
            .order_by(InformationalMessage.created_at.desc())
        )).scalars().all()
        return InfoMessagesListResponse(
            enabled=channel.info_messages_enabled,
            auto_reply_enabled=channel.auto_reply_enabled,
            items=[InfoMessageResponse.model_validate(row) for row in rows],
        )
