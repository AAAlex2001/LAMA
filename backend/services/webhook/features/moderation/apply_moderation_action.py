import asyncio
import logging

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType
from backend.models.bots import Bot as BotModel
from backend.services.bot_provider import resolve_by_token
from backend.services.rate_limiter import RateLimitTimeout
from backend.services.webhook.features.moderation.ban_user import BanUser
from backend.services.webhook.features.moderation.check_moderation_admin import (
    CheckModerationAdmin,
)
from backend.services.webhook.features.moderation.create_moderation_event import (
    CreateModerationEvent,
)
from backend.services.webhook.features.moderation.delete_moderated_message import (
    DeleteModeratedMessage,
)
from backend.services.webhook.features.moderation.kick_user import KickUser
from backend.services.webhook.features.moderation.mute_user import MuteUser
from backend.services.webhook.features.moderation.unmute_user import UnmuteUser

logger = logging.getLogger(__name__)


class ApplyModerationAction:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        message: Message,
        action: ActionType | None,
        mute_duration: int | None,
        channel,
        reason: str | None = None,
        reason_source: str | None = None,
        reason_context: dict | None = None,
    ) -> bool:
        if not action:
            return False

        try:
            bot = resolve_by_token(self.bot_model.token)
            if await CheckModerationAdmin().execute(bot, message):
                return False

            if message.from_user:
                await self.apply_user_action(
                    bot,
                    message,
                    action,
                    mute_duration,
                )

            await DeleteModeratedMessage().execute(bot, message)
            await CreateModerationEvent(self.db, self.bot_model).execute(
                message=message,
                channel=channel,
                action=action,
                mute_duration=mute_duration,
                reason=reason,
                reason_source=reason_source,
                reason_context=reason_context,
            )
            return True

        except asyncio.TimeoutError:
            user_id = message.from_user.id if message.from_user else "unknown"
            logger.warning("Moderation action timeout for user %s", user_id)
        except RateLimitTimeout as exc:
            logger.warning("Moderation action skipped by Telegram rate limit: %s", exc)
        except Exception as exc:
            logger.error("Failed to apply moderation action: %s", exc, exc_info=True)
            raise
        return False

    async def apply_user_action(
        self,
        bot,
        message: Message,
        action: ActionType,
        mute_duration: int | None,
    ) -> None:
        try:
            if action == ActionType.MUTE:
                await MuteUser().execute(bot, message, mute_duration)
            elif action == ActionType.KICK:
                await KickUser().execute(bot, message)
            elif action == ActionType.BAN:
                await BanUser().execute(bot, message)
            elif action == ActionType.UNMUTE:
                await UnmuteUser().execute(bot, message)
        except TelegramBadRequest as exc:
            logger.debug(
                "Cannot apply action to user=%s: %s",
                message.from_user.id if message.from_user else None,
                exc,
            )
