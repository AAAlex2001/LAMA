import asyncio
import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatMemberUpdated, ChatPermissions
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, PendingJoinApproval, TriggerType
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent
from backend.services.webhook.features.subscriptions.mark_join_request_accepted import (
    MarkJoinRequestAccepted,
)
from backend.services.webhook.types import TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class AcceptPendingApprovals:
    """Принимает все PendingApproval-ы юзера при автоодобрении."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.fire_event = FireTriggerEvent(db)

    async def execute(
        self,
        chat_member: ChatMemberUpdated,
        user_id: int,
        channel_id: int,
        telegram_bot,
    ) -> None:
        pendings = await self.get_user_pendings(user_id)
        if not pendings:
            return

        accepted = []
        for pending in pendings:
            if channel_id not in pending.missing_channels:
                continue
            pending.missing_channels.remove(channel_id)
            if not pending.missing_channels:
                accepted.append(pending)

        for pending in accepted:
            await self.unrestrict_user(telegram_bot, pending)
            await self.approve_join_request(telegram_bot, pending)
            await self.fire_event.execute(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                user_id=pending.user_id,
                chat_id=pending.chat_id,
                telegram_bot=telegram_bot,
                chat_type=chat_member.chat.type,
                context={"auto_approved": True, "channel_id": channel_id},
            )
            await MarkJoinRequestAccepted(self.db).execute(
                pending.user_id,
                pending.chat_id,
            )
            await self.db.delete(pending)

        await self.db.flush()

    async def get_user_pendings(self, user_id: int) -> list[PendingJoinApproval]:
        result = await self.db.execute(
            select(PendingJoinApproval).where(PendingJoinApproval.user_id == user_id)
        )
        return list(result.scalars().all())

    async def unrestrict_user(self, telegram_bot, pending: PendingJoinApproval) -> None:
        try:
            await telegram_bot.restrict_chat_member(
                chat_id=pending.chat_id,
                user_id=pending.user_id,
                permissions=ChatPermissions(
                    can_send_messages=True,
                    can_send_audios=True,
                    can_send_documents=True,
                    can_send_photos=True,
                    can_send_videos=True,
                    can_send_video_notes=True,
                    can_send_voice_notes=True,
                    can_send_polls=True,
                    can_send_other_messages=True,
                    can_add_web_page_previews=True,
                    can_invite_users=True,
                ),
                use_independent_chat_permissions=True,
            )
        except TelegramAPIError as exc:
            logger.warning("Failed to unrestrict user %s: %s", pending.user_id, exc)

    async def approve_join_request(self, telegram_bot, pending: PendingJoinApproval) -> None:
        try:
            await asyncio.wait_for(
                telegram_bot.approve_chat_join_request(
                    chat_id=pending.chat_id,
                    user_id=pending.user_id,
                ),
                timeout=TELEGRAM_API_TIMEOUT,
            )
        except (TelegramAPIError, asyncio.TimeoutError) as exc:
            logger.info(
                "approve_chat_join_request skipped for user %s in chat %s: %s",
                pending.user_id,
                pending.chat_id,
                exc,
            )
