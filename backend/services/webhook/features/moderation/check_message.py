import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.channel.features.antispam import CheckChannelLinks
from backend.services.channel.features.flood import CheckUserFlood
from backend.services.channel.features.moderation_rules import CheckMessageAgainstRules
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.features.moderation.apply_moderation_action import (
    ApplyModerationAction,
)

logger = logging.getLogger(__name__)


class CheckMessage:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, message: Message) -> bool:
        try:
            channel = await self.get_channel(message)
            if not channel:
                return False

            if await self.check_flood(message, channel):
                return True

            text_content = message.text or message.caption
            if not text_content:
                return False

            if await self.check_links(message, channel, text_content):
                return True

            return await self.check_rules(message, channel, text_content)

        except Exception as exc:
            logger.error("Moderation error: %s", exc, exc_info=True)
            raise
        return False

    async def get_channel(self, message: Message):
        return await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )

    async def check_flood(self, message: Message, channel) -> bool:
        if (
            message.chat.type not in {"group", "supergroup"}
            or not message.from_user
            or not channel.flood_message_limit
            or not channel.flood_interval_seconds
        ):
            return False

        is_flood, action, mute_duration = await CheckUserFlood(self.db).execute(
            channel=channel,
            user_id=message.from_user.id,
        )
        if not (is_flood and action):
            return False

        return await ApplyModerationAction(self.db, self.bot_model).execute(
            message=message,
            action=action,
            mute_duration=mute_duration,
            channel=channel,
            reason=(
                f"Flood control triggered: more than {channel.flood_message_limit} "
                f"messages in {channel.flood_interval_seconds}s"
            ),
            reason_source="channel_flood_settings",
        )

    async def check_links(self, message: Message, channel, text_content: str) -> bool:
        should_block, action, mute_duration, reason = await CheckChannelLinks().execute(
            channel,
            text_content,
        )
        if not should_block:
            return False

        return await ApplyModerationAction(self.db, self.bot_model).execute(
            message=message,
            action=action,
            mute_duration=mute_duration,
            channel=channel,
            reason=reason,
            reason_source="channel_link_filter",
        )

    async def check_rules(self, message: Message, channel, text_content: str) -> bool:
        if not channel.banned_words_enabled:
            return False

        rule = await CheckMessageAgainstRules(self.db).execute(channel.id, text_content)
        if not rule:
            return False

        return await ApplyModerationAction(self.db, self.bot_model).execute(
            message=message,
            action=rule.action,
            mute_duration=rule.mute_duration_minutes,
            channel=channel,
            reason=f"Moderation rule triggered: {rule.phrase}",
            reason_source="channel_moderation_rule",
            reason_context={"rule_id": rule.id, "phrase": rule.phrase},
        )
