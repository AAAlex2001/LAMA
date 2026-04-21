"""
Обработчик модерации сообщений
"""
import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

from aiogram.types import Message, ChatPermissions
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel import (
    ChannelModerationService,
    AntispamService,
    FloodService,
)
from backend.models.channels import ActionType
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.inbox.event_service import InboxEventService
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.base import (
    TELEGRAM_API_TIMEOUT,
    DB_QUERY_TIMEOUT,
)

logger = logging.getLogger(__name__)


class ModerationHandler:
    """Обработчик модерации сообщений"""

    def __init__(self, db: AsyncSession, bot_model):
        self.db = db
        self.bot_model = bot_model

    async def process(self, message: Message) -> None:
        """Обработка модерации сообщения"""
        try:
            text_content = message.text or message.caption
            logger.info(
                "Moderation check: chat=%s type=%s from_user=%s",
                message.chat.id, message.chat.type,
                message.from_user.id if message.from_user else None,
            )

            channel = await asyncio.wait_for(
                get_channel_by_telegram_id(self.db, message.chat.id),
                timeout=DB_QUERY_TIMEOUT,
            )
            if not channel:
                return

            if (message.chat.type in {"group", "supergroup"}
                    and message.from_user
                    and channel.flood_message_limit
                    and channel.flood_interval_seconds):
                flood_service = FloodService(self.db)
                is_flood, flood_action, flood_mute = await asyncio.wait_for(
                    flood_service.check_flood(
                        channel=channel,
                        user_id=message.from_user.id,
                    ),
                    timeout=DB_QUERY_TIMEOUT
                )

                if is_flood and flood_action:
                    await self.apply_action(
                        message,
                        flood_action,
                        flood_mute,
                        channel=channel,
                        reason=(
                            f"Flood control triggered: more than {channel.flood_message_limit} "
                            f"messages in {channel.flood_interval_seconds}s"
                        ),
                        reason_source="channel_flood_settings",
                    )
                    await self.db.commit()
                    return

            if not text_content:
                return

            antispam_service = AntispamService(self.db)
            should_block, action, mute_duration, reason = \
                antispam_service.check_channel_links(channel, text_content)

            if should_block:
                await self.apply_action(
                    message,
                    action,
                    mute_duration,
                    channel=channel,
                    reason=reason,
                    reason_source="channel_link_filter",
                )
                return

            if channel.banned_words_enabled:
                moderation_service = ChannelModerationService(self.db)
                rule = await asyncio.wait_for(
                    moderation_service.check_message(
                        channel.id, text_content
                    ),
                    timeout=DB_QUERY_TIMEOUT
                )

                if rule:
                    await self.apply_action(
                        message,
                        rule.action,
                        rule.mute_duration_minutes,
                        channel=channel,
                        reason=f"Moderation rule triggered: {rule.phrase}",
                        reason_source="channel_moderation_rule",
                        reason_context={"rule_id": rule.id, "phrase": rule.phrase},
                    )

        except asyncio.TimeoutError:
            logger.warning(
                f"Moderation timeout for message {message.message_id}")
        except Exception as e:
            logger.error(f"Moderation error: {e}", exc_info=True)

    async def apply_action(
        self,
        message: Message,
        action: Optional[ActionType],
        mute_duration: Optional[int],
        channel=None,
        reason: Optional[str] = None,
        reason_source: Optional[str] = None,
        reason_context: Optional[dict] = None,
    ) -> None:
        if not action:
            return

        try:
            bot = resolve_by_token(self.bot_model.token)

            if message.from_user:
                try:
                    member = await asyncio.wait_for(
                        bot.get_chat_member(message.chat.id, message.from_user.id),
                        timeout=TELEGRAM_API_TIMEOUT,
                    )
                    if member.status in ("creator", "administrator"):
                        logger.debug("Skipping moderation for admin/owner user=%s", message.from_user.id)
                        return
                except TelegramAPIError as e:
                    if "can't remove chat owner" in str(e) or "user is an administrator" in str(e):
                        return
                    logger.debug("Failed to check member status: %s", e)
                except asyncio.TimeoutError:
                    pass

            if message.from_user:
                try:
                    if action == ActionType.MUTE:
                        await self.mute_user(bot, message, mute_duration)
                    elif action == ActionType.KICK:
                        await self.kick_user(bot, message)
                    elif action == ActionType.BAN:
                        await self.ban_user(bot, message)
                    elif action == ActionType.UNMUTE:
                        await self.unmute_user(bot, message)
                except TelegramBadRequest as e:
                    logger.debug("Cannot apply action to user=%s: %s", message.from_user.id, e)

            try:
                await asyncio.wait_for(
                    bot.delete_message(
                        chat_id=message.chat.id,
                        message_id=message.message_id,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
                )
            except (TelegramAPIError, asyncio.TimeoutError) as e:
                logger.debug(f"Failed to delete message: {e}")

            await self.create_block_event(
                message=message,
                channel=channel,
                action=action,
                mute_duration=mute_duration,
                reason=reason,
                reason_source=reason_source,
                reason_context=reason_context,
            )

        except asyncio.TimeoutError:
            uid = message.from_user.id if message.from_user else 'unknown'
            logger.warning(
                f"Moderation action timeout for user {uid}")
        except Exception as e:
            logger.error(
                f"Failed to apply moderation action: {e}", exc_info=True)

    async def create_block_event(
        self,
        message: Message,
        channel,
        action: ActionType,
        mute_duration: Optional[int],
        reason: Optional[str],
        reason_source: Optional[str],
        reason_context: Optional[dict],
    ) -> None:
        if action not in (ActionType.MUTE, ActionType.KICK, ActionType.BAN):
            return
        if not (message.from_user and channel):
            return

        try:
            event_service = InboxEventService(self.db)
            message_text = (message.text or message.caption or "").strip()
            if len(message_text) > 500:
                message_text = f"{message_text[:497]}..."

            payload = {
                "ban_type": "mute" if action == ActionType.MUTE else "ban",
                "is_unbanned": False,
                "duration_minutes": mute_duration,
                "chat_id": message.chat.id,
                "message_id": message.message_id,
                "message_text": message_text or None,
                "block_reason": reason,
                "reason": reason,
                "reason_source": reason_source,
                "action": action.value,
                "automatic": True,
            }
            if reason_context:
                payload["reason_context"] = reason_context

            await event_service.create_event(InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.SYSTEM,
                entity_type=EntityType.CHANNEL,
                event_type=EventType.CHANNEL_BAN,
                bot_id=self.bot_model.id,
                channel_id=channel.id,
                tg_user_id=message.from_user.id,
                tg_username=message.from_user.username,
                status=EventStatus.NEW,
                description=message_text or f"Автомодерация пользователя {message.from_user.id}",
                payload=payload,
            ))
        except Exception as e:
            logger.error("Failed to create moderation inbox event: %s", e, exc_info=True)

    async def mute_user(
        self, bot, message: Message, mute_duration: Optional[int]
    ) -> None:
        """Заглушить пользователя"""
        if not message.from_user:
            return

        until_date = None
        if mute_duration:
            until_date = datetime.now(timezone.utc) + \
                                      timedelta(minutes=mute_duration)

        permissions = ChatPermissions(
            can_send_messages=False,
            can_send_media_messages=False,
            can_send_polls=False,
            can_send_other_messages=False,
            can_add_web_page_previews=False,
            can_pin_messages=False,
            can_change_info=False,
            can_invite_users=False,
        )

        await asyncio.wait_for(
            bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
                permissions=permissions,
                until_date=until_date,
            ),
            timeout=TELEGRAM_API_TIMEOUT
        )

    async def kick_user(self, bot, message: Message) -> None:
        """Кикнуть пользователя"""
        if not message.from_user:
            return

        await asyncio.wait_for(
            bot.ban_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
                revoke_messages=False,
            ),
            timeout=TELEGRAM_API_TIMEOUT
        )

    async def ban_user(self, bot, message: Message) -> None:
        """Забанить пользователя (перманентный бан)"""
        if not message.from_user:
            return

        await asyncio.wait_for(
            bot.ban_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
            ),
            timeout=TELEGRAM_API_TIMEOUT
        )

    async def unmute_user(self, bot, message: Message) -> None:
        """Снять мут с пользователя"""
        if not message.from_user:
            return

        permissions = ChatPermissions(
            can_send_messages=True,
            can_send_media_messages=True,
            can_send_polls=True,
            can_send_other_messages=True,
            can_add_web_page_previews=True,
            can_pin_messages=False,
            can_change_info=False,
            can_invite_users=True,
        )

        await asyncio.wait_for(
            bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
                permissions=permissions,
            ),
            timeout=TELEGRAM_API_TIMEOUT
        )
