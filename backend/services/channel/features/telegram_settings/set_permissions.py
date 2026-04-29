from datetime import datetime, timezone
from typing import Any, Dict, Optional

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import ChatPermissions
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.query_utils import get_channel

NIGHT_MODE_FIELDS = {
    "night_mode_enabled": bool,
    "night_mode_start": str,
    "night_mode_end": str,
    "night_mode_block_media": bool,
    "night_mode_block_text": bool,
}


def apply_night_mode_settings(channel: ChannelGroup, settings: Dict[str, Any]) -> None:
    """Записывает в канал поля ночного режима из dict, кастуя значения в нужный тип."""
    for field, cast in NIGHT_MODE_FIELDS.items():
        if field in settings:
            setattr(channel, field, cast(settings[field]))


class SetChannelPermissions:
    """Устанавливает Telegram-permissions канала и опционально применяет настройки ночного режима."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        permissions: Optional[Dict[str, bool]] = None,
        night_mode_settings: Optional[Dict[str, Any]] = None,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 400 если ничего не передано; 404 если канал чужой."""
        if not permissions and not night_mode_settings:
            raise HTTPException(status_code=400, detail="No permissions provided")

        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        bot = await resolve_for_channel(self.db, channel)

        try:
            if permissions:
                await bot.set_chat_permissions(
                    chat_id=channel.telegram_id,
                    permissions=ChatPermissions(**permissions),
                )
                channel.permissions = permissions

            if night_mode_settings:
                apply_night_mode_settings(channel, night_mode_settings)
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Failed to set channel permissions: {exc}")

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
