from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import InformationalMessage
from backend.schemas.channels.info_messages import InfoMessageCreate
from backend.services.channel.features.info_messages.lookup import find_channel_or_404


class CreateInfoMessage:
    """Создаёт информационное сообщение канала."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, channel_id: int, data: InfoMessageCreate, owner_id: int,
    ) -> InformationalMessage:
        await find_channel_or_404(self.db, channel_id, owner_id)
        msg = InformationalMessage(
            channel_id=channel_id,
            text=data.text,
            media_url=data.media_url,
            media_type=data.media_type,
            media_urls=data.media_urls or None,
            inline_keyboard=data.inline_keyboard,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg
