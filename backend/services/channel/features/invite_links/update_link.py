import logging

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.schemas.channels import InviteLinkUpdate
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.invite_links.lookup import (
    find_invite_link_or_404,
    to_expire_timestamp,
)

logger = logging.getLogger(__name__)

EDITABLE_FIELDS = (
    "name",
    "expire_date",
    "member_limit",
    "creates_join_request",
    "protection_type",
    "entry_method",
)


class UpdateInviteLink:
    """Обновляет пригласительную ссылку в Telegram и в БД."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel: ChannelGroup,
        link_id: int,
        data: InviteLinkUpdate,
    ) -> ChatInviteLink:
        """Возвращает обновлённую ссылку. 400 если ссылка отозвана/основная или Telegram отклонил."""
        link = await find_invite_link_or_404(self.db, link_id, channel.id)
        if link.is_revoked or link.is_primary:
            raise HTTPException(status_code=400, detail="Cannot update revoked or primary invite link")

        update_data = data.model_dump(exclude_unset=True)

        new_name = update_data.get("name", link.name)
        new_expire_date = update_data.get("expire_date", link.expire_date)
        new_creates_join = update_data.get("creates_join_request", link.creates_join_request)
        raw_limit = update_data.get("member_limit", link.member_limit)
        member_limit = None if new_creates_join else (raw_limit or None)

        bot = await resolve_for_channel(self.db, channel)
        try:
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=link.invite_link,
                name=new_name,
                expire_date=to_expire_timestamp(new_expire_date),
                member_limit=member_limit,
                creates_join_request=new_creates_join,
            )
        except TelegramAPIError as exc:
            logger.error("Error updating invite link: %s", exc)
            raise HTTPException(status_code=400, detail="Failed to update invite link in Telegram")

        for field in EDITABLE_FIELDS:
            if field in update_data:
                setattr(link, field, update_data[field])

        link.pending_join_request_count = tg_link.pending_join_request_count or 0

        await self.db.flush()
        await self.db.refresh(link)
        return link
