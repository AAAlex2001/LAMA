import logging
import os
from datetime import datetime
from typing import Optional

import pytz
from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import resolve_by_token, resolve_master
from backend.services.channel.utils.message_utils import is_within_window, time_to_minutes
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

NIGHT_MODE_TIMEZONE = pytz.timezone(os.getenv("NIGHT_MODE_TIMEZONE", "Europe/Moscow"))


def is_night_active(channel: ChannelGroup) -> bool:
    """Возвращает True, если сейчас активно ночное окно канала."""
    start = time_to_minutes(channel.night_mode_start)
    end = time_to_minutes(channel.night_mode_end)
    if start is None or end is None:
        return False
    now = datetime.now(NIGHT_MODE_TIMEZONE)
    return is_within_window(now.hour * 60 + now.minute, start, end)


def resolve_channel_bot(channel: ChannelGroup) -> Optional[RateLimitedBot]:
    """Возвращает бота канала или master-бота. ``None`` если ни одного нет."""
    if channel.bot and channel.bot.token:
        return resolve_by_token(channel.bot.token)
    try:
        return resolve_master()
    except ValueError:
        return None


def build_chat_permissions(channel: ChannelGroup) -> ChatPermissions:
    """Собирает merged ChatPermissions из media-блока и активного ночного режима."""
    blocked = channel.block_media_types or []
    night = channel.night_mode_enabled and is_night_active(channel)

    block_text = night and channel.night_mode_block_text
    block_media = night and channel.night_mode_block_media

    return ChatPermissions(
        can_send_messages=not block_text,
        can_send_photos=not (block_media or "photo" in blocked),
        can_send_videos=not (block_media or "video" in blocked),
        can_send_video_notes=not block_media,
        can_send_voice_notes=not (block_media or "voice" in blocked),
        can_send_audios=not (block_media or "voice" in blocked),
        can_send_documents=not (block_media or "files" in blocked),
        can_send_other_messages=not (block_media or "gif" in blocked),
        can_send_polls=not (block_text and block_media),
        can_add_web_page_previews=not (block_text and block_media),
        can_invite_users=True,
        can_pin_messages=False,
        can_change_info=False,
        can_manage_topics=False,
    )


class ApplyChannelPermissions:
    """Применяет права чата канала в Telegram согласно его модерационным настройкам."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel: ChannelGroup) -> bool:
        """Возвращает True если права успешно применены, иначе False."""
        chat_id = channel.linked_chat_id or channel.telegram_id
        if not chat_id:
            return False

        bot = resolve_channel_bot(channel)
        if bot is None:
            logger.warning("No bot found for channel %s", channel.id)
            return False

        try:
            await bot.set_chat_permissions(
                chat_id=chat_id,
                permissions=build_chat_permissions(channel),
                use_independent_chat_permissions=True,
            )
            logger.info("Applied chat permissions for channel %s (chat_id=%s)", channel.id, chat_id)
            return True
        except TelegramAPIError as exc:
            logger.error("Failed to set chat permissions for %s: %s", chat_id, exc)
            return False
