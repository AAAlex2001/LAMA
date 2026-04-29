from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import CaptchaFailAction, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


class UpdateCaptchaSettings:
    """Обновляет настройки капчи канала (только переданные поля)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        owner_id: int,
        enabled: Optional[bool] = None,
        timeout_seconds: Optional[int] = None,
        fail_action: Optional[CaptchaFailAction] = None,
        fail_duration_seconds: Optional[int] = None,
        restriction_type: Optional[str] = None,
        message_before: Optional[str] = None,
        message_fail: Optional[str] = None,
        message_success: Optional[str] = None,
    ) -> ChannelGroup:
        """Возвращает обновлённый канал. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Channel not found")

        if enabled is not None:
            channel.captcha_enabled = enabled
        if timeout_seconds is not None:
            channel.captcha_timeout_seconds = timeout_seconds
        if fail_action is not None:
            channel.captcha_fail_action = fail_action
        if fail_duration_seconds is not None:
            channel.captcha_fail_duration_seconds = fail_duration_seconds
        if restriction_type is not None:
            channel.captcha_restriction_type = restriction_type
        if message_before is not None:
            channel.captcha_message_before = message_before
        if message_fail is not None:
            channel.captcha_message_fail = message_fail
        if message_success is not None:
            channel.captcha_message_success = message_success

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
