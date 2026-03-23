import logging
import os
from datetime import datetime

import pytz
from aiogram.types import ChatPermissions
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.services.bot_provider import get_cached_bot
from backend.services.channel.utils.message_utils import time_to_minutes, is_within_window

logger = logging.getLogger(__name__)


class ChatPermissionsService:
    """Builds and applies merged ChatPermissions based on all active moderation settings."""

    def __init__(self, db: AsyncSession):
        self.db = db
        tz_name = os.getenv("NIGHT_MODE_TIMEZONE", "Europe/Moscow")
        try:
            self.timezone = pytz.timezone(tz_name)
        except Exception:
            self.timezone = pytz.timezone("Europe/Moscow")

    async def apply_permissions(self, channel: ChannelGroup) -> bool:
        """Build and apply merged permissions for a channel. Returns True on success."""
        if not channel.telegram_id:
            return False

        bot = self.resolve_bot(channel)
        if not bot:
            logger.warning("No bot found for channel %s", channel.id)
            return False

        permissions = self.build_permissions(channel)

        try:
            await bot.set_chat_permissions(
                chat_id=channel.telegram_id,
                permissions=permissions,
            )
            logger.info(
                "Applied chat permissions for channel %s (tg=%s)",
                channel.id, channel.telegram_id,
            )
            return True
        except TelegramAPIError as e:
            logger.error("Failed to set chat permissions for %s: %s", channel.telegram_id, e)
            return False

    def build_permissions(self, channel: ChannelGroup) -> ChatPermissions:
        """Build merged ChatPermissions from all active moderation settings."""
        can_send_messages = True
        can_send_photos = True
        can_send_videos = True
        can_send_video_notes = True
        can_send_voice_notes = True
        can_send_audios = True
        can_send_documents = True
        can_send_other_messages = True
        can_send_polls = True
        can_add_web_page_previews = True
        can_invite_users = True

        blocked_types = channel.block_media_types or []
        if blocked_types:
            if "photo" in blocked_types:
                can_send_photos = False
            if "video" in blocked_types:
                can_send_videos = False
            if "gif" in blocked_types:
                can_send_other_messages = False
            if "files" in blocked_types:
                can_send_documents = False
            if "voice" in blocked_types:
                can_send_voice_notes = False
                can_send_audios = False

        if channel.night_mode_enabled and self.is_night_active(channel):
            if channel.night_mode_block_text:
                can_send_messages = False
            if channel.night_mode_block_media:
                can_send_photos = False
                can_send_videos = False
                can_send_video_notes = False
                can_send_voice_notes = False
                can_send_audios = False
                can_send_documents = False
                can_send_other_messages = False
            if channel.night_mode_block_text and channel.night_mode_block_media:
                can_send_polls = False
                can_add_web_page_previews = False

        return ChatPermissions(
            can_send_messages=can_send_messages,
            can_send_photos=can_send_photos,
            can_send_videos=can_send_videos,
            can_send_video_notes=can_send_video_notes,
            can_send_voice_notes=can_send_voice_notes,
            can_send_audios=can_send_audios,
            can_send_documents=can_send_documents,
            can_send_other_messages=can_send_other_messages,
            can_send_polls=can_send_polls,
            can_add_web_page_previews=can_add_web_page_previews,
            can_invite_users=can_invite_users,
            can_pin_messages=False,
            can_change_info=False,
            can_manage_topics=False,
        )

    def is_night_active(self, channel: ChannelGroup) -> bool:
        start_minutes = time_to_minutes(channel.night_mode_start)
        end_minutes = time_to_minutes(channel.night_mode_end)
        if start_minutes is None or end_minutes is None:
            return False
        now = datetime.now(self.timezone)
        now_minutes = now.hour * 60 + now.minute
        return is_within_window(now_minutes, start_minutes, end_minutes)

    def resolve_bot(self, channel: ChannelGroup):
        """Resolve bot for channel. Returns RateLimitedBot or None."""
        if channel.bot and channel.bot.token:
            return get_cached_bot(channel.bot.token)
        master_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        if master_token:
            return get_cached_bot(master_token)
        return None
