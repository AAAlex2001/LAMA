import asyncio
import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ActionType
from backend.services.channel.features.antispam import CheckChannelLinks
from backend.services.channel.features.flood import CheckUserFlood, is_banned
from backend.services.channel.features.moderation_rules import CheckMessageAgainstRules
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.webhook.types import DB_QUERY_TIMEOUT

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

            from_user = message.from_user
            if from_user and await is_banned(message.chat.id, from_user.id):
                self.enqueue_delete(message)
                return True

            if await self.check_flood(message, channel):
                return True

            text_content = message.text or message.caption
            if not text_content:
                return False

            if await self.check_links(message, channel, text_content):
                return True

            return await self.check_rules(message, channel, text_content)

        except asyncio.TimeoutError:
            await self.db.rollback()
            logger.warning("Moderation timeout for message %s", message.message_id)
            return False
        except Exception as exc:
            await self.db.rollback()
            logger.error("Moderation error: %s", exc, exc_info=True)
            return False

    async def get_channel(self, message: Message):
        return await asyncio.wait_for(
            get_channel_by_telegram_id(
                self.db,
                message.chat.id,
                bot_id=self.bot_model.id,
            ),
            timeout=DB_QUERY_TIMEOUT,
        )

    async def check_flood(self, message: Message, channel) -> bool:
        if (
            message.chat.type not in {"group", "supergroup"}
            or not message.from_user
            or not channel.flood_message_limit
            or not channel.flood_interval_seconds
        ):
            return False

        is_flood, action, mute_duration = await CheckUserFlood().execute(
            channel=channel,
            user_id=message.from_user.id,
        )
        if not (is_flood and action):
            return False

        return self.enqueue(
            message=message,
            action=action,
            mute_duration=mute_duration,
            reason=(
                f"Flood control triggered: more than {channel.flood_message_limit} "
                f"messages in {channel.flood_interval_seconds}s"
            ),
            reason_source="channel_flood_settings",
            reason_context=None,
        )

    async def check_links(self, message: Message, channel, text_content: str) -> bool:
        should_block, action, mute_duration, reason = await CheckChannelLinks().execute(
            channel,
            text_content,
        )
        if not should_block:
            return False

        return self.enqueue(
            message=message,
            action=action,
            mute_duration=mute_duration,
            reason=reason,
            reason_source="channel_link_filter",
            reason_context=None,
        )

    async def check_rules(self, message: Message, channel, text_content: str) -> bool:
        if not channel.banned_words_enabled:
            return False

        rule = await asyncio.wait_for(
            CheckMessageAgainstRules(self.db).execute(channel.id, text_content),
            timeout=DB_QUERY_TIMEOUT,
        )
        if not rule:
            return False

        return self.enqueue(
            message=message,
            action=rule.action,
            mute_duration=rule.mute_duration_minutes,
            reason=f"Moderation rule triggered: {rule.phrase}",
            reason_source="channel_moderation_rule",
            reason_context={"rule_id": rule.id, "phrase": rule.phrase},
        )

    def enqueue(
        self,
        message: Message,
        action: ActionType,
        mute_duration: int | None,
        reason: str,
        reason_source: str,
        reason_context: dict | None,
    ) -> bool:
        from backend.celery.tasks import apply_moderation_action

        from_user = message.from_user
        apply_moderation_action.apply_async(
            args=[
                self.bot_model.id,
                message.chat.id,
                message.message_id,
                from_user.id if from_user else None,
                from_user.username if from_user else None,
                (message.text or message.caption or "")[:500] or None,
                action.value,
                mute_duration,
                reason,
                reason_source,
                reason_context,
            ],
            queue="moderation",
        )
        return True

    def enqueue_delete(self, message: Message) -> None:
        from backend.celery.tasks import delayed_delete_message

        delayed_delete_message.apply_async(
            args=[self.bot_model.id, message.chat.id, message.message_id],
            queue="autodelete",
        )
