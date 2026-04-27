import logging
from typing import List

from aiogram.exceptions import TelegramAPIError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.invite_links.list_links import ListInviteLinks
from backend.services.channel.features.invite_links.lookup import to_expire_timestamp

logger = logging.getLogger(__name__)


class SyncInviteLinks:
    """Синхронизирует все ссылки канала с Telegram (primary + member_count для каждой)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel: ChannelGroup) -> List[ChatInviteLink]:
        """Возвращает обновлённый список ссылок канала."""
        bot = await resolve_for_channel(self.db, channel)

        try:
            primary = await bot.export_chat_invite_link(channel.telegram_id)
            await self.upsert_primary(channel.id, primary)
        except TelegramAPIError as exc:
            logger.warning("Failed to get primary link: %s", exc)

        links = await ListInviteLinks(self.db).execute(channel.id)
        for link in links:
            if link.is_revoked or link.is_primary:
                continue
            await self.refresh_counters(channel, link, bot)

        await self.db.flush()
        return links

    async def upsert_primary(self, channel_id: int, invite_link: str) -> ChatInviteLink:
        """Атомарно создаёт primary-ссылку или помечает существующую как primary.

        Использует ``INSERT ... ON CONFLICT (invite_link) DO UPDATE`` — без race condition.
        """
        statement = pg_insert(ChatInviteLink).values(
            channel_id=channel_id,
            invite_link=invite_link,
            is_primary=True,
            creates_join_request=False,
            is_revoked=False,
        ).on_conflict_do_update(
            index_elements=["invite_link"],
            set_={"is_primary": True},
        ).returning(ChatInviteLink)

        primary = (await self.db.execute(statement)).scalar_one()
        await self.db.flush()
        return primary

    @staticmethod
    async def refresh_counters(channel: ChannelGroup, link: ChatInviteLink, bot) -> None:
        """Обновляет ``member_count`` и ``pending_join_request_count`` одной ссылки."""
        try:
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=link.invite_link,
                name=link.name,
                expire_date=to_expire_timestamp(link.expire_date),
                member_limit=link.member_limit,
                creates_join_request=link.creates_join_request,
            )
        except TelegramAPIError as exc:
            logger.debug("Failed to refresh link %s: %s", link.invite_link, exc)
            return

        link.member_count = tg_link.member_count or 0
        link.pending_join_request_count = tg_link.pending_join_request_count or 0
