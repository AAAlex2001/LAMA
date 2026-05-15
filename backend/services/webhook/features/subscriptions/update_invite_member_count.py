import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatMemberUpdated
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChatInviteLink
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.subscriptions.find_invite_link_from_inbox import (
    FindInviteLinkFromInbox,
)

logger = logging.getLogger(__name__)


class UpdateInviteMemberCount:
    """Инкрементит counter у invite-ссылки при вступлении через неё."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, chat_member: ChatMemberUpdated, user_id: int) -> None:
        link_url = self.get_invite_link_url(chat_member)
        if not link_url:
            link_url = await FindInviteLinkFromInbox().execute(
                self.db,
                user_id,
                chat_member.chat.id,
            )
        if not link_url:
            logger.debug("Invite link not found for user=%s, chat=%s", user_id, chat_member.chat.id)
            return

        try:
            stmt = (
                update(ChatInviteLink)
                .where(ChatInviteLink.invite_link == link_url)
                .values(member_count=ChatInviteLink.member_count + 1)
                .execution_options(synchronize_session=False)
            )
            result = await self.db.execute(stmt)
            if result.rowcount <= 0:
                logger.warning("Link not found in DB for counter update: %s", link_url)
                return

            await self.db.flush()
            logger.info("Incremented member_count for link %s", link_url)
            await self.revoke_if_limit_reached(link_url, chat_member.chat.id)
        except Exception as exc:
            logger.error("Failed to increment member_count for %s: %s", link_url, exc)

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
            await bot.revoke_chat_invite_link(
                chat_id=chat_id,
                invite_link=link_url,
            )
        except TelegramAPIError as exc:
            logger.warning("Failed to revoke link via Telegram: %s", exc)
        link.is_revoked = True
        await self.db.flush()

    @staticmethod
    def get_invite_link_url(chat_member: ChatMemberUpdated) -> str | None:
        invite_link = getattr(chat_member, "invite_link", None)
        return invite_link.invite_link if invite_link else None
