"""
Обработчик подписок на каналы
"""

import asyncio
import logging

from aiogram.types import ChatMemberUpdated
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.models.channels import ChatInviteLink, ChannelGroup
from backend.models.bots import (
    Bot as BotModel,
    PendingJoinApproval,
    TriggerType,
)
from backend.schemas.inbox.enums import EventType
from backend.services.bot import TriggerService
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class SubscriptionHandler:

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)

    async def process(self, chat_member: ChatMemberUpdated) -> None:
        new_status = chat_member.new_chat_member.status
        old_status = chat_member.old_chat_member.status
        user_id = chat_member.from_user.id
        chat_id = chat_member.chat.id

        logger.info(
            f"chat_member update: user={user_id} chat={chat_id} "
            f"old_status={old_status!r} new_status={new_status!r} "
            f"invite_link={chat_member.invite_link!r}"
        )

        # old_status 'restricted' может быть как у члена группы, так и у не-члена.
        # Проверяем is_member чтобы не считать смену прав у существующего участника за новый вход.
        old_is_active = old_status in ("member", "administrator", "creator") or (
            old_status == "restricted" and getattr(chat_member.old_chat_member, "is_member", False)
        )

        is_new_join = (
            new_status in ("member", "administrator", "creator", "restricted")
            and not old_is_active
        )

        if not is_new_join:
            return

        await self.update_member_count(chat_member)
        await self.handle_subscription(chat_member, user_id, chat_id)

    async def update_member_count(self, chat_member: ChatMemberUpdated) -> None:
        user_id = chat_member.from_user.id
        chat_id = chat_member.chat.id
        invite_link_url = None

        logger.info(
            f"update_member_count: user={user_id} chat={chat_id} "
            f"invite_link={chat_member.invite_link!r}"
        )

        if chat_member.invite_link:
            invite_link_url = chat_member.invite_link.invite_link
            logger.info(f"Got invite_link from chat_member: {invite_link_url}")

        if not invite_link_url:
            invite_link_url = await self.find_link_url_from_inbox(
                user_id=user_id,
                telegram_chat_id=chat_id,
            )
            if invite_link_url:
                logger.info(f"Got invite_link from InboxEvent: {invite_link_url}")
            else:
                logger.warning(
                    f"No invite_link found for user={user_id} chat={chat_id} — skipping member_count update"
                )

        if not invite_link_url:
            return

        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == invite_link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
                .execution_options(synchronize_session=False)
            )
            result = await self.db.execute(stmt)
            if result.rowcount > 0:
                await self.db.commit()
                logger.info(f"member_count +1 for link {invite_link_url}")
            else:
                logger.warning(f"No ChatInviteLink found for url={invite_link_url}, member_count NOT updated")
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update member_count: {e}")

    async def find_link_url_from_inbox(self, user_id: int, telegram_chat_id: int) -> str | None:
        try:
            channel_result = await self.db.execute(
                select(ChannelGroup.id).where(ChannelGroup.telegram_id == telegram_chat_id)
            )
            channel_id = channel_result.scalar_one_or_none()
            if not channel_id:
                return None

            result = await self.db.execute(
                select(InboxEvent)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                )
                .order_by(InboxEvent.id.desc())
                .limit(1)
            )
            event = result.scalar_one_or_none()
            if event and event.payload:
                return event.payload.get("link_url")
        except Exception as e:
            logger.error(f"find_link_url_from_inbox failed: {e}")
        return None

    async def handle_subscription(
        self, chat_member: ChatMemberUpdated, user_id: int, channel_id: int
    ) -> None:
        """Обработка подписки на канал"""
        try:
            query = select(PendingJoinApproval).where(
                PendingJoinApproval.user_id == user_id
            )
            result = await self.db.execute(query)
            pendings = list(result.scalars().all())

            if not pendings:
                return

            approved_pendings = []

            for pending in pendings:
                if channel_id not in pending.missing_channels:
                    continue

                pending.missing_channels.remove(channel_id)

                if not pending.missing_channels:
                    approved_pendings.append(pending)

            if approved_pendings:
                async with get_bot_session(
                    self.bot_model.token
                ) as telegram_bot:
                    for pending in approved_pendings:
                        try:
                            await asyncio.wait_for(
                                telegram_bot.approve_chat_join_request(
                                    chat_id=pending.chat_id,
                                    user_id=pending.user_id,
                                ),
                                timeout=TELEGRAM_API_TIMEOUT,
                            )

                            await self.trigger_service.fire_event(
                                bot_id=self.bot_model.id,
                                trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                                user_id=pending.user_id,
                                chat_id=pending.chat_id,
                                telegram_bot=telegram_bot,
                                chat_type=chat_member.chat.type,
                                context={
                                    "auto_approved": True,
                                    "channel_id": channel_id,
                                },
                            )

                        except (TelegramAPIError, asyncio.TimeoutError) as e:
                            logger.warning(
                                f"Failed to approve join request: {e}"
                            )

                        await self.db.delete(pending)

            await self.db.commit()

        except Exception as e:
            logger.error(f"Subscription processing error: {e}", exc_info=True)
            await self.db.rollback()
