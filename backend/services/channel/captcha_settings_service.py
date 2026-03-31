from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import CaptchaFailAction, ChannelGroup
from backend.services.channel.utils.query_utils import get_channel


class CaptchaSettingsService:
    """Управление per-channel настройками капчи (только для supergroups)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_settings(self, channel_id: int, owner_id: int) -> ChannelGroup:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel

    async def update_settings(
        self,
        channel_id: int,
        owner_id: int,
        captcha_enabled: Optional[bool] = None,
        captcha_timeout_seconds: Optional[int] = None,
        captcha_fail_action: Optional[CaptchaFailAction] = None,
        captcha_fail_duration_seconds: Optional[int] = None,
        captcha_restriction_type: Optional[str] = None,
        captcha_message_before: Optional[str] = None,
        captcha_message_fail: Optional[str] = None,
        captcha_message_success: Optional[str] = None,
    ) -> ChannelGroup:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        if captcha_enabled is not None:
            channel.captcha_enabled = captcha_enabled
        if captcha_timeout_seconds is not None:
            channel.captcha_timeout_seconds = captcha_timeout_seconds
        if captcha_fail_action is not None:
            channel.captcha_fail_action = captcha_fail_action
        if captcha_fail_duration_seconds is not None:
            channel.captcha_fail_duration_seconds = captcha_fail_duration_seconds
        if captcha_restriction_type is not None:
            channel.captcha_restriction_type = captcha_restriction_type
        if captcha_message_before is not None:
            channel.captcha_message_before = captcha_message_before
        if captcha_message_fail is not None:
            channel.captcha_message_fail = captcha_message_fail
        if captcha_message_success is not None:
            channel.captcha_message_success = captcha_message_success

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(channel)
        return channel
