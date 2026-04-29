from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import InformationalMessage
from backend.schemas.channels.info_messages import InfoMessageUpdate
from backend.services.channel.features.info_messages.lookup import (
    find_channel_or_404,
    find_info_message_or_404,
)


class UpdateInfoMessage:
    """Обновляет информационное сообщение канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, channel_id: int, message_id: int, data: InfoMessageUpdate, owner_id: int,
    ) -> InformationalMessage:
        await find_channel_or_404(self.db, channel_id, owner_id)
        msg = await find_info_message_or_404(self.db, channel_id, message_id)

        for field, value in data.model_dump(exclude_none=True).items():
            if field == "media_urls":
                msg.media_urls = value or None
            else:
                setattr(msg, field, value)

        await self.db.flush()
        await self.db.refresh(msg)
        return msg
