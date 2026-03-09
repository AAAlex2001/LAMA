import logging
from typing import List, Optional

from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, ChatInviteLink
from backend.schemas.channels import InviteLinkCreate, InviteLinkUpdate
from backend.services.bot_provider import resolve_for_channel
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


class InviteLinkService:
    """Управление пригласительными ссылками."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def resolve_bot(self, channel: ChannelGroup) -> RateLimitedBot:
        """Бот для канала."""
        return await resolve_for_channel(self.db, channel)

    async def create(
        self,
        channel: ChannelGroup,
        data: InviteLinkCreate,
        creator_id: int,
    ) -> Optional[ChatInviteLink]:
        """Создать пригласительную ссылку."""
        bot = await self.resolve_bot(channel)

        expire_timestamp = int(data.expire_date.timestamp()) if data.expire_date else None
        member_limit = None if data.creates_join_request else data.member_limit

        try:
            tg_link = await bot.create_chat_invite_link(
                chat_id=channel.telegram_id,
                name=data.name,
                expire_date=expire_timestamp,
                member_limit=member_limit,
                creates_join_request=data.creates_join_request,
            )
        except TelegramAPIError as e:
            logger.error("Error creating invite link: %s", e)
            return None

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
        )
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def update(
        self,
        channel: ChannelGroup,
        link_id: int,
        data: InviteLinkUpdate,
    ) -> Optional[ChatInviteLink]:
        """Обновить пригласительную ссылку."""
        invite_link = await self.get(link_id, channel.id)
        if not invite_link or invite_link.is_revoked or invite_link.is_primary:
            return None

        bot = await self.resolve_bot(channel)

        expire_timestamp = int(data.expire_date.timestamp()) if data.expire_date else None
        new_creates_join = data.creates_join_request if data.creates_join_request is not None else invite_link.creates_join_request
        member_limit = None if new_creates_join else (
            data.member_limit if data.member_limit is not None else invite_link.member_limit
        )

        try:
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=invite_link.invite_link,
                name=data.name if data.name is not None else invite_link.name,
                expire_date=expire_timestamp,
                member_limit=member_limit,
                creates_join_request=new_creates_join,
            )
        except TelegramAPIError as e:
            logger.error("Error updating invite link: %s", e)
            return None

        if data.name is not None:
            invite_link.name = data.name
        if data.expire_date is not None:
            invite_link.expire_date = data.expire_date
        if data.member_limit is not None:
            invite_link.member_limit = data.member_limit
        if data.creates_join_request is not None:
            invite_link.creates_join_request = data.creates_join_request
        invite_link.pending_join_request_count = tg_link.pending_join_request_count or 0

        await self.db.commit()
        await self.db.refresh(invite_link)
        return invite_link

    async def revoke(self, channel: ChannelGroup, link_id: int) -> Optional[ChatInviteLink]:
        """Отозвать пригласительную ссылку."""
        invite_link = await self.get(link_id, channel.id)
        if not invite_link:
            return None
        if invite_link.is_revoked:
            return invite_link
        if invite_link.is_primary:
            return None

        bot = await self.resolve_bot(channel)

        try:
            await bot.revoke_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=invite_link.invite_link,
            )
        except TelegramAPIError as e:
            logger.error("Error revoking invite link: %s", e)
            return None

        invite_link.is_revoked = True
        await self.db.commit()
        await self.db.refresh(invite_link)
        return invite_link

    async def get(self, link_id: int, channel_id: int) -> Optional[ChatInviteLink]:
        """Получить ссылку по ID."""
        query = select(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list(self, channel_id: int) -> List[ChatInviteLink]:
        """Список ссылок канала."""
        query = (
            select(ChatInviteLink)
            .where(ChatInviteLink.channel_id == channel_id)
            .order_by(ChatInviteLink.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete(self, link_id: int, channel_id: int) -> bool:
        """Удалить ссылку из БД."""
        query = delete(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id,
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0

    async def sync(self, channel: ChannelGroup) -> List[ChatInviteLink]:
        """Синхронизировать ссылки с Telegram."""
        bot = await self.resolve_bot(channel)

        try:
            primary_link = await bot.export_chat_invite_link(channel.telegram_id)
            await self.save_or_update_primary(channel.id, primary_link)
        except TelegramAPIError as e:
            logger.warning("Failed to get primary link: %s", e)

        return await self.list(channel.id)

    async def save_or_update_primary(self, channel_id: int, invite_link: str) -> ChatInviteLink:
        """Сохранить или обновить основную ссылку."""
        query = select(ChatInviteLink).where(ChatInviteLink.invite_link == invite_link)
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.is_primary = True
            await self.db.commit()
            return existing

        new_link = ChatInviteLink(
            channel_id=channel_id,
            invite_link=invite_link,
            is_primary=True,
            creates_join_request=False,
            is_revoked=False,
        )
        self.db.add(new_link)
        await self.db.commit()
        await self.db.refresh(new_link)
        return new_link
