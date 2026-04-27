import logging

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.schemas.channels import InviteLinkCreate
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.invite_links.lookup import to_expire_timestamp

logger = logging.getLogger(__name__)


class CreateInviteLink:
    """Создаёт пригласительную ссылку в Telegram и сохраняет её в БД."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel: ChannelGroup,
        data: InviteLinkCreate,
        creator_id: int,
    ) -> ChatInviteLink:
        """Возвращает созданную ссылку. 400 если Telegram отклонил создание."""
        bot = await resolve_for_channel(self.db, channel)
        member_limit = None if data.creates_join_request else (data.member_limit or None)

        try:
            tg_link = await bot.create_chat_invite_link(
                chat_id=channel.telegram_id,
                name=data.name,
                expire_date=to_expire_timestamp(data.expire_date),
                member_limit=member_limit,
                creates_join_request=data.creates_join_request,
            )
        except TelegramAPIError as exc:
            logger.error("Error creating invite link: %s", exc)
            raise HTTPException(status_code=400, detail="Failed to create invite link")

        link = ChatInviteLink(
            channel_id=channel.id,
            invite_link=tg_link.invite_link,
            name=tg_link.name,
            creator_id=creator_id,
            creates_join_request=tg_link.creates_join_request or False,
            is_primary=False,
            is_revoked=False,
            expire_date=data.expire_date,
            member_limit=tg_link.member_limit,
            pending_join_request_count=tg_link.pending_join_request_count or 0,
            member_count=0,
            protection_type=data.protection_type,
            entry_method=data.entry_method,
        )
        self.db.add(link)
        await self.db.flush()
        await self.db.refresh(link)
        return link
