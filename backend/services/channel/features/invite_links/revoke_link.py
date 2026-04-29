import logging

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.invite_links.lookup import find_invite_link_or_404

logger = logging.getLogger(__name__)


class RevokeInviteLink:
    """Отзывает пригласительную ссылку в Telegram и помечает её ``is_revoked=True``."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel: ChannelGroup, link_id: int) -> ChatInviteLink:
        """Возвращает отозванную ссылку. 400 если ссылка основная."""
        link = await find_invite_link_or_404(self.db, link_id, channel.id)
        if link.is_revoked:
            return link
        if link.is_primary:
            raise HTTPException(status_code=400, detail="Cannot revoke primary invite link")

        bot = await resolve_for_channel(self.db, channel)
        try:
            await bot.revoke_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=link.invite_link,
            )
        except TelegramAPIError as exc:
            logger.error("Error revoking invite link: %s", exc)
            raise HTTPException(status_code=400, detail="Failed to revoke invite link in Telegram")

        link.is_revoked = True
        await self.db.flush()
        await self.db.refresh(link)
        return link
