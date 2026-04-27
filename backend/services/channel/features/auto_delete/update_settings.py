from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelAutoDeleteSettings
from backend.schemas.channels import ChannelAutoDeleteSettingsUpdate
from backend.services.channel.features.auto_delete.get_settings import ensure_auto_delete_settings
from backend.services.channel.utils.query_utils import get_channel


class UpdateAutoDeleteSettings:
    """Обновляет настройки автоудаления канала (только переданные поля)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        data: ChannelAutoDeleteSettingsUpdate,
    ) -> ChannelAutoDeleteSettings:
        """Возвращает обновлённые настройки. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id, load_auto_delete=True)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        settings = await ensure_auto_delete_settings(self.db, channel)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(settings, field, value)

        await self.db.flush()
        await self.db.refresh(settings)
        return settings
