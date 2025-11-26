from datetime import datetime
from typing import Optional, Tuple
import os

import pytz
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup


class ChannelNightModeService:
    """Проверка и применение правил ночного режима."""

    def __init__(self, db: AsyncSession):
        self.db = db
        tz_name = os.getenv("NIGHT_MODE_TIMEZONE", "Europe/Moscow")
        try:
            self.timezone = pytz.timezone(tz_name)
        except Exception:
            self.timezone = pytz.timezone("Europe/Moscow")

    async def should_block_message(self, telegram_chat_id: int, is_media: bool) -> Tuple[bool, Optional[str]]:
        channel = await self.get_channel(telegram_chat_id)
        if not channel or not channel.night_mode_enabled:
            return False, None

        start_minutes = self.time_to_minutes(channel.night_mode_start)
        end_minutes = self.time_to_minutes(channel.night_mode_end)
        if start_minutes is None or end_minutes is None:
            return False, None

        now_minutes = self.current_minutes()
        if not self.is_within_window(now_minutes, start_minutes, end_minutes):
            return False, None

        if is_media and channel.night_mode_block_media:
            return True, self.build_notice(channel)
        if (not is_media) and channel.night_mode_block_text:
            return True, self.build_notice(channel)
        return False, None

    async def get_channel(self, telegram_chat_id: int) -> Optional[ChannelGroup]:
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_chat_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def time_to_minutes(value: Optional[str]) -> Optional[int]:
        if not value:
            return None
        try:
            hours_str, minutes_str = value.split(":")
            hours = int(hours_str)
            minutes = int(minutes_str)
            if not (0 <= hours < 24 and 0 <= minutes < 60):
                return None
            return hours * 60 + minutes
        except (ValueError, AttributeError):
            return None

    def current_minutes(self) -> int:
        now = datetime.now(self.timezone)
        return now.hour * 60 + now.minute

    @staticmethod
    def is_within_window(current: int, start: int, end: int) -> bool:
        if start == end:
            return False
        if start < end:
            return start <= current < end
        return current >= start or current < end

    def build_notice(self, channel: ChannelGroup) -> str:
        start = channel.night_mode_start or "--:--"
        end = channel.night_mode_end or "--:--"
        timezone_name = self.timezone.zone

        blocked_items = []
        if channel.night_mode_block_text:
            blocked_items.append("текстовые сообщения")
        if channel.night_mode_block_media:
            blocked_items.append("медиа")

        if blocked_items:
            restrictions = " и ".join(blocked_items)
        else:
            restrictions = "сообщения"

        return (
            f"🌙 Ночной режим активен с {start} до {end} ({timezone_name}). "
            f"В это время нельзя отправлять {restrictions}."
        )

