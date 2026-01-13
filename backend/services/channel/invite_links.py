"""
Сервис для работы с пригласительными ссылками
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink, ChannelGroup
from backend.models.bots import Bot as TelegramBot
from backend.schemas.channels import InviteLinkCreate, InviteLinkUpdate

logger = logging.getLogger(__name__)


class InviteLinkService:
    """Сервис управления пригласительными ссылками"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_bot_for_channel(self, channel: ChannelGroup) -> Optional[Bot]:
        """Получить бота для канала"""
        if not channel.bot_id:
            return None

        query = select(TelegramBot).where(TelegramBot.id == channel.bot_id)
        result = await self.db.execute(query)
        bot_record = result.scalar_one_or_none()

        if not bot_record or not bot_record.token:
            return None

        return Bot(token=bot_record.token)

    async def create_link(
        self,
        channel: ChannelGroup,
        data: InviteLinkCreate,
        creator_id: int
    ) -> Optional[ChatInviteLink]:
        """Создать пригласительную ссылку через Telegram API"""
        bot = await self.get_bot_for_channel(channel)
        if not bot:
            logger.error(f"Бот не найден для канала {channel.id}")
            return None

        # Создаём ссылку через Telegram API
        expire_timestamp = None
        if data.expire_date:
            expire_timestamp = int(data.expire_date.timestamp())

        # Если требуется одобрение, member_limit не указываем
        member_limit = None if data.creates_join_request else data.member_limit

        try:
            tg_link = await bot.create_chat_invite_link(
                chat_id=channel.telegram_id,
                name=data.name,
                expire_date=expire_timestamp,
                member_limit=member_limit,
                creates_join_request=data.creates_join_request
            )
        except TelegramAPIError as e:
            logger.error(f"Ошибка создания invite-ссылки: {e}")
            return None
        finally:
            await bot.session.close()

        # Сохраняем в БД
        invite_link = ChatInviteLink(
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
            member_count=0
        )

        self.db.add(invite_link)
        await self.db.commit()
        await self.db.refresh(invite_link)

        logger.info(
            f"Создана invite-ссылка ID={invite_link.id} для канала {channel.id}")
        return invite_link

    async def update_link(
        self,
        channel: ChannelGroup,
        link_id: int,
        data: InviteLinkUpdate
    ) -> Optional[ChatInviteLink]:
        """Обновить пригласительную ссылку"""
        invite_link = await self.get_link(link_id, channel.id)
        if not invite_link:
            return None

        if invite_link.is_revoked:
            logger.warning(
                f"Попытка редактировать отозванную ссылку {link_id}")
            return None

        if invite_link.is_primary:
            logger.warning(f"Попытка редактировать основную ссылку {link_id}")
            return None

        bot = await self.get_bot_for_channel(channel)
        if not bot:
            logger.error(f"Бот не найден для канала {channel.id}")
            return None

        # Обновляем через Telegram API
        expire_timestamp = None
        if data.expire_date:
            expire_timestamp = int(data.expire_date.timestamp())

        # Если требуется одобрение, member_limit не указываем
        new_creates_join = data.creates_join_request if data.creates_join_request is not None else invite_link.creates_join_request
        member_limit = None if new_creates_join else (
            data.member_limit if data.member_limit is not None else invite_link.member_limit)

        try:
            tg_link = await bot.edit_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=invite_link.invite_link,
                name=data.name if data.name is not None else invite_link.name,
                expire_date=expire_timestamp,
                member_limit=member_limit,
                creates_join_request=new_creates_join
            )
        except TelegramAPIError as e:
            logger.error(f"Ошибка обновления invite-ссылки: {e}")
            return None
        finally:
            await bot.session.close()

        # Обновляем в БД
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

        logger.info(f"Обновлена invite-ссылка ID={link_id}")
        return invite_link

    async def revoke_link(
        self,
        channel: ChannelGroup,
        link_id: int
    ) -> Optional[ChatInviteLink]:
        """Отозвать пригласительную ссылку"""
        invite_link = await self.get_link(link_id, channel.id)
        if not invite_link:
            return None

        if invite_link.is_revoked:
            logger.warning(f"Ссылка {link_id} уже отозвана")
            return invite_link

        if invite_link.is_primary:
            logger.warning(f"Нельзя отозвать основную ссылку {link_id}")
            return None

        bot = await self.get_bot_for_channel(channel)
        if not bot:
            logger.error(f"Бот не найден для канала {channel.id}")
            return None

        try:
            await bot.revoke_chat_invite_link(
                chat_id=channel.telegram_id,
                invite_link=invite_link.invite_link
            )
        except TelegramAPIError as e:
            logger.error(f"Ошибка отзыва invite-ссылки: {e}")
            return None
        finally:
            await bot.session.close()

        invite_link.is_revoked = True
        await self.db.commit()
        await self.db.refresh(invite_link)

        logger.info(f"Отозвана invite-ссылка ID={link_id}")
        return invite_link

    async def get_link(self, link_id: int, channel_id: int) -> Optional[ChatInviteLink]:
        """Получить ссылку по ID"""
        query = select(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_links(self, channel_id: int) -> List[ChatInviteLink]:
        """Список ссылок канала"""
        query = select(ChatInviteLink).where(
            ChatInviteLink.channel_id == channel_id
        ).order_by(ChatInviteLink.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_link(self, link_id: int, channel_id: int) -> bool:
        """Удалить ссылку из БД"""
        query = delete(ChatInviteLink).where(
            ChatInviteLink.id == link_id,
            ChatInviteLink.channel_id == channel_id
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0

    async def sync_links(self, channel: ChannelGroup) -> List[ChatInviteLink]:
        """Синхронизировать ссылки с Telegram API"""
        bot = await self.get_bot_for_channel(channel)
        if not bot:
            logger.error(f"Бот не найден для канала {channel.id}")
            return await self.list_links(channel.id)

        try:
            # Экспортируем основную ссылку
            primary_link = await bot.export_chat_invite_link(channel.telegram_id)

            # Сохраняем/обновляем основную ссылку
            await self.save_or_update_primary_link(channel.id, primary_link)

        except TelegramAPIError as e:
            logger.warning(f"Не удалось получить основную ссылку: {e}")
        finally:
            await bot.session.close()

        return await self.list_links(channel.id)

    async def save_or_update_primary_link(
        self,
        channel_id: int,
        invite_link: str
    ) -> ChatInviteLink:
        """Сохранить или обновить основную ссылку в БД"""
        query = select(ChatInviteLink).where(
            ChatInviteLink.invite_link == invite_link
        )
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
            is_revoked=False
        )
        self.db.add(new_link)
        await self.db.commit()
        await self.db.refresh(new_link)

        return new_link
