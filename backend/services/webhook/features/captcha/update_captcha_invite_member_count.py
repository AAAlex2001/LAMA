import logging

from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChatInviteLink
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.subscriptions.find_invite_link_from_inbox import (
    FindInviteLinkFromInbox,
)

logger = logging.getLogger(__name__)


class UpdateCaptchaInviteMemberCount:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, user_id: int, telegram_chat_id: int) -> None:
        try:
            link_url = await FindInviteLinkFromInbox().execute(
                self.db,
                user_id,
                telegram_chat_id,
            )
            if not link_url:
                return

            result = await self.db.execute(
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
            )
            if result.rowcount > 0:
                await self.db.flush()
                logger.info("Captcha approval incremented member_count for %s", link_url)
                await self.revoke_if_limit_reached(link_url, telegram_chat_id)
        except Exception as exc:
            logger.error("captcha invite member count update failed: %s", exc)

    async def revoke_if_limit_reached(self, link_url: str, chat_id: int) -> None:
        result = await self.db.execute(
            select(ChatInviteLink).where(ChatInviteLink.invite_link == link_url)
        )
        link = result.scalar_one_or_none()
        if not link or not link.member_limit:
            return
        if link.member_count < link.member_limit or link.is_revoked:
            return

        bot = resolve_by_token(self.bot_model.token)
        try:
            await bot.revoke_chat_invite_link(chat_id=chat_id, invite_link=link_url)
        except TelegramAPIError as exc:
            logger.warning("Failed to revoke link: %s", exc)
        link.is_revoked = True
        await self.db.flush()
