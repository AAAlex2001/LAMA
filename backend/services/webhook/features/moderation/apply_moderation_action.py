import logging

from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ActionType
from backend.services.bot_provider import resolve_for_bot_id
from backend.services.channel.features.flood import is_banned, mark_banned
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
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
    """Применить модерационное действие к сообщению: ban/mute/kick + delete + inbox event."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(
        self,
        bot_id: int,
        chat_id: int,
        message_id: int,
        user_id: int | None,
        username: str | None,
        message_text: str | None,
        action: ActionType,
        mute_duration: int | None,
        reason: str | None,
        reason_source: str | None,
        reason_context: dict | None,
    ) -> str:
        bot_model = await self.db.get(BotModel, bot_id)
        if not bot_model:
            return f"no_bot:{bot_id}"

        channel = await get_channel_by_telegram_id(self.db, chat_id, bot_id=bot_id)
        if not channel:
            return f"no_channel:{chat_id}"

        bot = await resolve_for_bot_id(self.db, bot_id)
        already_banned = bool(user_id) and await is_banned(chat_id, user_id)

        try:
            if user_id and not already_banned:
                if await CheckModerationAdmin().execute(bot, chat_id, user_id):
                    await DeleteModeratedMessage().execute(bot, chat_id, message_id)
                    return "admin_skipped"

                if action == ActionType.MUTE:
                    await MuteUser().execute(bot, chat_id, user_id, mute_duration)
                elif action == ActionType.KICK:
                    await KickUser().execute(bot, chat_id, user_id)
                elif action == ActionType.BAN:
                    await BanUser().execute(bot, chat_id, user_id)
                elif action == ActionType.UNMUTE:
                    await UnmuteUser().execute(bot, chat_id, user_id)

                await mark_banned(chat_id, user_id)

            await DeleteModeratedMessage().execute(bot, chat_id, message_id)

            if user_id and not already_banned:
                await CreateModerationEvent(self.db, bot_model).execute(
                    channel_id=channel.id,
                    chat_id=chat_id,
                    message_id=message_id,
                    user_id=user_id,
                    username=username,
                    message_text=message_text,
                    action=action,
                    mute_duration=mute_duration,
                    reason=reason,
                    reason_source=reason_source,
                    reason_context=reason_context,
                )

            return "deleted_only" if already_banned else "ok"

        except RateLimitTimeout as exc:
            logger.warning("moderation_rate_limited: user=%s wait=%s", user_id, exc.wait_seconds)
            return f"rate_limited:{int(exc.wait_seconds)}"
        except TelegramBadRequest as exc:
            logger.debug("moderation_bad_request: user=%s %s", user_id, exc)
            return "bad_request"
        except TelegramAPIError as exc:
            logger.warning("moderation_api_error: user=%s %s", user_id, exc)
            return "api_error"
