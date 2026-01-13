"""
Обработчик модерации сообщений
"""
import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

from aiogram.types import Message, ChatPermissions
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel import (
    ChannelModerationService,
    AntispamService,
    FloodService,
)
from backend.models.channels import ActionType
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT, DB_QUERY_TIMEOUT

logger = logging.getLogger(__name__)


class ModerationHandler:
    """Обработчик модерации сообщений"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process(self, message: Message) -> None:
        """Обработка модерации сообщения"""
        try:
            text_content = message.text or message.caption

            # Проверка антифлуда (только для групп с from_user)
            if message.chat.type in {"group", "supergroup"} and message.from_user:
                flood_service = FloodService(self.db)
                is_flood, flood_action, flood_mute = await asyncio.wait_for(
                    flood_service.check_flood_by_telegram_id(
                        telegram_id=message.chat.id,
                        user_id=message.from_user.id,
                    ),
                    timeout=DB_QUERY_TIMEOUT
                )

                if is_flood and flood_action:
                    await self.apply_action(message, flood_action, flood_mute)
                    return

            # Проверка антиспама (ссылки)
            antispam_service = AntispamService(self.db)
            should_block, action, mute_duration, reason = await asyncio.wait_for(
                antispam_service.check_antispam_by_telegram_id(
                    message.chat.id, text_content or ""
                ),
                timeout=DB_QUERY_TIMEOUT
            )

            if should_block:
                await self.apply_action(message, action, mute_duration)
                return

            # Проверка правил модерации (запрещённые слова)
            moderation_service = ChannelModerationService(self.db)
            rule = await asyncio.wait_for(
                moderation_service.check_message_by_telegram_id(
                    message.chat.id, text_content or ""
                ),
                timeout=DB_QUERY_TIMEOUT
            )

            if rule:
                await self.apply_action(message, rule.action, rule.mute_duration_minutes)

        except asyncio.TimeoutError:
            logger.warning(
                f"Moderation timeout for message {message.message_id}")
        except Exception as e:
            logger.error(f"Moderation error: {e}", exc_info=True)

    async def apply_action(
        self,
        message: Message,
        action: ActionType,
        mute_duration: Optional[int]
    ) -> None:
        """Применить действие модерации"""
        try:
            async with get_bot_session() as bot:
                # Удаляем сообщение
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

                # Применяем действие к пользователю
                if not message.from_user:
                    return

                if action == ActionType.MUTE:
                    await self.mute_user(bot, message, mute_duration)
                elif action == ActionType.KICK:
                    await self.kick_user(bot, message)
                elif action == ActionType.UNMUTE:
                    await self.unmute_user(bot, message)

        except asyncio.TimeoutError:
            logger.warning(
                f"Moderation action timeout for user {message.from_user.id if message.from_user else 'unknown'}")
        except Exception as e:
            logger.error(
                f"Failed to apply moderation action: {e}", exc_info=True)

    async def mute_user(self, bot, message: Message, mute_duration: Optional[int]) -> None:
        """Заглушить пользователя"""
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
        await asyncio.wait_for(
            bot.ban_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
                revoke_messages=False,
            ),
            timeout=TELEGRAM_API_TIMEOUT
        )

    async def unmute_user(self, bot, message: Message) -> None:
        """Снять мут с пользователя"""
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
