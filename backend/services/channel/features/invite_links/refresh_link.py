import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.invite_links.lookup import to_expire_timestamp

logger = logging.getLogger(__name__)


class RefreshInviteLink:
    """Подтягивает актуальный member_count одной ссылки из Telegram (no-op для primary/revoked)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel: ChannelGroup, link: ChatInviteLink) -> ChatInviteLink:
        """Возвращает обновлённую ссылку или ту же, если запрос провалился."""
        if link.is_revoked or link.is_primary:
            return link

        try:
            bot = await resolve_for_channel(self.db, channel)
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=link.invite_link,
                name=link.name,
                expire_date=to_expire_timestamp(link.expire_date),
                member_limit=link.member_limit if link.member_limit else None,
                creates_join_request=link.creates_join_request,
            )
        except Exception as exc:
            logger.debug("Failed to refresh link %s: %s", link.invite_link, exc)
            return link

        link.member_count = tg_link.member_count or 0
        link.pending_join_request_count = tg_link.pending_join_request_count or 0
        await self.db.flush()
        await self.db.refresh(link)
        return link
