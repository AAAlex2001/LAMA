import os
from datetime import datetime
from typing import Optional, Tuple

import pytz
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.channel.utils.message_utils import is_within_window, time_to_minutes
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id


class NightModeService:
    """Проверка ночного режима."""

    def __init__(self, db: AsyncSession):
        self.db = db
        tz_name = os.getenv("NIGHT_MODE_TIMEZONE", "Europe/Moscow")
        try:
            self.timezone = pytz.timezone(tz_name)
        except Exception:
            self.timezone = pytz.timezone("Europe/Moscow")

    async def should_block_message(self, telegram_chat_id: int, is_media: bool) -> Tuple[bool, Optional[str]]:
        """Проверить, нужно ли блокировать сообщение."""
        channel = await get_channel_by_telegram_id(self.db, telegram_chat_id)
        if not channel or not channel.night_mode_enabled:
            return False, None

        start_minutes = time_to_minutes(channel.night_mode_start)
        end_minutes = time_to_minutes(channel.night_mode_end)
        if start_minutes is None or end_minutes is None:
            return False, None

        now = datetime.now(self.timezone)
        now_minutes = now.hour * 60 + now.minute
        if not is_within_window(now_minutes, start_minutes, end_minutes):
            return False, None

        if is_media and channel.night_mode_block_media:
            return True, self.build_notice(channel)
        if not is_media and channel.night_mode_block_text:
            return True, self.build_notice(channel)
        return False, None

    def build_notice(self, channel: ChannelGroup) -> str:
        """Собрать уведомление о ночном режиме."""
        start = channel.night_mode_start or "--:--"
        end = channel.night_mode_end or "--:--"

        blocked_items = []
        if channel.night_mode_block_text:
            blocked_items.append("текстовые сообщения")
        if channel.night_mode_block_media:
            blocked_items.append("медиа")
        restrictions = " и ".join(blocked_items) if blocked_items else "сообщения"

        return (
            f"🌙 Ночной режим активен с {start} до {end} ({self.timezone.zone}). "
            f"В это время нельзя отправлять {restrictions}."
        )
