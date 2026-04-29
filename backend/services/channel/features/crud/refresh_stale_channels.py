import asyncio
import logging
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.utils.chat_data_utils import build_chat_data

logger = logging.getLogger(__name__)


class RefreshStaleChannels:
    """Подтягивает свежие данные с Telegram для каналов, у которых есть бот."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channels: Iterable[ChannelGroup]) -> None:
        targets = [ch for ch in channels if ch.bot and ch.bot.token]
        if not targets:
            return

        now = datetime.now(timezone.utc)
        await asyncio.gather(*[refresh_one(channel, now) for channel in targets])
        await self.db.flush()


async def refresh_one(channel: ChannelGroup, now: datetime) -> None:
    """Обновляет один канал, ошибки телеграм-API проглатываются."""
    try:
        bot = resolve_by_token(channel.bot.token)
        chat = await bot.get_chat(channel.telegram_id)
        chat_data = await build_chat_data(bot, chat, channel.bot.token)
        for field, value in chat_data.items():
            setattr(channel, field, value)
        channel.last_sync_at = now
        channel.updated_at = now
    except Exception as exc:
        logger.debug("Failed to refresh channel %s: %s", channel.id, exc)
