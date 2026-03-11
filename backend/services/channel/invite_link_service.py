import logging
from typing import List, Optional

from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
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
    ) -> ChatInviteLink:
        """Создать пригласительную ссылку."""
        bot = await self.resolve_bot(channel)

        expire_timestamp = int(data.expire_date.timestamp()) if data.expire_date else None
        member_limit = None if data.creates_join_request else (data.member_limit or None)

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
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def update(
        self,
        channel: ChannelGroup,
        link_id: int,
        data: InviteLinkUpdate,
    ) -> ChatInviteLink:
        """Обновить пригласительную ссылку."""
        invite_link = await self.get(link_id, channel.id)
        if invite_link.is_revoked or invite_link.is_primary:
            raise HTTPException(status_code=400, detail="Cannot update revoked or primary invite link")

        bot = await self.resolve_bot(channel)

        update_data = data.model_dump(exclude_unset=True)

        new_name = update_data.get("name", invite_link.name)
        new_expire_date = update_data.get("expire_date", invite_link.expire_date)
        new_creates_join = update_data.get("creates_join_request", invite_link.creates_join_request)
        raw_limit = update_data.get("member_limit", invite_link.member_limit)
        
        expire_timestamp = int(new_expire_date.timestamp()) if new_expire_date else None
        member_limit = None if new_creates_join else (raw_limit or None)

        try:
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=invite_link.invite_link,
                name=new_name,
                expire_date=expire_timestamp,
                member_limit=member_limit,
                creates_join_request=new_creates_join,
            )
        except TelegramAPIError as e:
            logger.error("Error updating invite link: %s", e)
            raise HTTPException(status_code=400, detail="Failed to update invite link in Telegram")

        if "name" in update_data:
            invite_link.name = update_data["name"]
        if "expire_date" in update_data:
            invite_link.expire_date = update_data["expire_date"]
        if "member_limit" in update_data:
            invite_link.member_limit = update_data["member_limit"]
        if "creates_join_request" in update_data:
            invite_link.creates_join_request = update_data["creates_join_request"]
        if "protection_type" in update_data:
            invite_link.protection_type = update_data["protection_type"]
        if "entry_method" in update_data:
            invite_link.entry_method = update_data["entry_method"]

        invite_link.pending_join_request_count = tg_link.pending_join_request_count or 0

        await self.db.commit()
        await self.db.refresh(invite_link)
        return invite_link

    async def revoke(self, channel: ChannelGroup, link_id: int) -> ChatInviteLink:
        """Отозвать пригласительную ссылку."""
        invite_link = await self.get(link_id, channel.id)
        if invite_link.is_revoked:
            return invite_link
        if invite_link.is_primary:
            raise HTTPException(status_code=400, detail="Cannot revoke primary invite link")

        bot = await self.resolve_bot(channel)

        try:
            await bot.revoke_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=invite_link.invite_link,
            )
        except TelegramAPIError as e:
            logger.error("Error revoking invite link: %s", e)
            raise HTTPException(status_code=400, detail="Failed to revoke invite link in Telegram")

        invite_link.is_revoked = True
        await self.db.commit()
        await self.db.refresh(invite_link)
        return invite_link

    async def get(self, link_id: int, channel_id: int) -> ChatInviteLink:
        """Получить ссылку по ID."""
        query = select(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id,
        )
        result = await self.db.execute(query)
        link = result.scalar_one_or_none()
        if not link:
            raise HTTPException(status_code=404, detail="Invite link not found")
        return link

    async def list(self, channel_id: int) -> List[ChatInviteLink]:
        """Список ссылок канала."""
        query = (
            select(ChatInviteLink)
            .where(ChatInviteLink.channel_id == channel_id)
            .order_by(ChatInviteLink.id.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def sync_single(self, channel: ChannelGroup, link: ChatInviteLink) -> ChatInviteLink:
        """Обновить member_count одной ссылки через Telegram API."""
        if link.is_revoked or link.is_primary:
            return link
        try:
            bot = await self.resolve_bot(channel)
            expire_ts = int(link.expire_date.timestamp()) if link.expire_date else None
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=link.invite_link,
                name=link.name,
                expire_date=expire_ts,
                member_limit=link.member_limit if link.member_limit else None,
                creates_join_request=link.creates_join_request,
            )
            link.member_count = tg_link.member_count or 0
            link.pending_join_request_count = tg_link.pending_join_request_count or 0
            await self.db.commit()
            await self.db.refresh(link)
        except Exception as e:
            logger.debug("Failed to sync single link %s: %s", link.invite_link, e)
        return link

    async def delete(self, link_id: int, channel_id: int) -> bool:
        """Удалить ссылку из БД."""
        query = delete(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id,
        )
        result = await self.db.execute(query)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Invite link not found")
        await self.db.commit()
        return True

    async def sync(self, channel: ChannelGroup) -> List[ChatInviteLink]:
        """Синхронизировать ссылки с Telegram."""
        bot = await self.resolve_bot(channel)

        try:
            primary_link = await bot.export_chat_invite_link(channel.telegram_id)
            await self.save_or_update_primary(channel.id, primary_link)
        except TelegramAPIError as e:
            logger.warning("Failed to get primary link: %s", e)

        links = await self.list(channel.id)
        for link in links:
            if link.is_revoked or link.is_primary:
                continue
            try:
                expire_ts = int(link.expire_date.timestamp()) if link.expire_date else None
                tg_link = await bot.edit_chat_invite_link(
                    chat_id=channel.telegram_id,
                    invite_link=link.invite_link,
                    name=link.name,
                    expire_date=expire_ts,
                    member_limit=link.member_limit,
                    creates_join_request=link.creates_join_request,
                )
                link.member_count = tg_link.member_count or 0
                link.pending_join_request_count = tg_link.pending_join_request_count or 0
            except TelegramAPIError as e:
                logger.debug("Failed to refresh link %s: %s", link.invite_link, e)

        await self.db.commit()
        return links

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
