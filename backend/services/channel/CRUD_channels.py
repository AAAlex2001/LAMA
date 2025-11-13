from datetime import datetime, timezone
from typing import List, Optional
import os

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.types import Chat
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import (
    ChannelGroup, ChannelType, BackupMode
)

from backend.schemas.channels import (
    ChannelGroupCreate, ChannelGroupUpdate
)

from backend.models.bots import Bot as BotModel


class CRUDChannelService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.master_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    
    def create_bot(self, token: str) -> Bot:
        """Создать экземпляр Bot из токена"""
        return Bot(token=token)
    
    def get_master_bot(self) -> Bot:
        """Получить мастер-бота из env для управления каналами"""
        if not self.master_bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN not set in environment")
        return Bot(token=self.master_bot_token)

    async def create_channel(self, data: ChannelGroupCreate, owner_id: int) -> ChannelGroup:
        """Создание канала/группы с проверкой на дубликаты"""
        query = select(ChannelGroup).where(
            ChannelGroup.telegram_id == data.telegram_id,
            ChannelGroup.owner_id == owner_id
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            return existing

        channel = ChannelGroup(
            owner_id=owner_id,
            telegram_id=data.telegram_id,
            channel_type=data.channel_type,
            title=data.title,
            username=data.username,
            description=data.description,
            is_active=True
        )

        self.db.add(channel)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def get_channel(self, channel_id: int, owner_id: Optional[int] = None) -> Optional[ChannelGroup]:
        """Получение канала по ID с проверкой владельца"""
        query = select(ChannelGroup).options(selectinload(ChannelGroup.bot)).where(
            ChannelGroup.id == channel_id
        )
        if owner_id is not None:
            query = query.where(ChannelGroup.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_channel_by_telegram_id(self, telegram_id: int) -> Optional[ChannelGroup]:
        """Получение канала по Telegram ID"""
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_channels(
            self,
            owner_id: int,
            page: int = 1,
            page_size: int = 50,
            channel_type: Optional[ChannelType] = None,
            is_active: Optional[bool] = None,
            backup_mode: Optional[BackupMode] = None
    ) -> tuple[List[ChannelGroup], int]:
        """Список каналов с фильтрацией и пагинацией"""
        query = select(ChannelGroup).where(ChannelGroup.owner_id == owner_id)
        count_query = select(func.count(distinct(ChannelGroup.id))).where(ChannelGroup.owner_id == owner_id)

        if channel_type:
            query = query.where(ChannelGroup.channel_type == channel_type)
            count_query = count_query.where(ChannelGroup.channel_type == channel_type)

        if is_active is not None:
            query = query.where(ChannelGroup.is_active == is_active)
            count_query = count_query.where(ChannelGroup.is_active == is_active)

        if backup_mode:
            query = query.where(ChannelGroup.backup_mode == backup_mode)
            count_query = count_query.where(ChannelGroup.backup_mode == backup_mode)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.order_by(ChannelGroup.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        channels = list(result.scalars().all())

        return channels, total

    async def update_channel(self, channel_id: int, data: ChannelGroupUpdate, owner_id: int) -> Optional[ChannelGroup]:
        """Обновление информации о канале"""
        channel = await self.get_channel(channel_id, owner_id=owner_id)
        if not channel:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(channel, field, value)

        channel.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def delete_channel(self, channel_id: int, owner_id: int) -> bool:
        """Удаление канала"""
        channel = await self.get_channel(channel_id, owner_id=owner_id)
        if not channel:
            return False

        await self.db.delete(channel)
        await self.db.commit()
        return True

    async def sync_channel_from_telegram(
            self,
            telegram_id: Optional[int] = None,
            username: Optional[str] = None,
            invite_link: Optional[str] = None,
            owner_id: int = None,
            bot_id: Optional[int] = None,
            token: Optional[str] = None
    ) -> ChannelGroup:
        """
        Синхронизация информации о канале через Telegram API

        Принимает один из идентификаторов:
        - telegram_id: числовой ID (-100...)
        - username: @username или просто username
        - invite_link: https://t.me/username или https://t.me/+hash
        """
        if not bot_id and not token:
            raise ValueError("Either bot_id or token must be provided")

        if not telegram_id and not username and not invite_link:
            raise ValueError("One of telegram_id, username, or invite_link must be provided")

        chat_identifier = telegram_id

        if username:
            chat_identifier = username if username.startswith("@") else f"@{username}"
        elif invite_link:
            if "t.me/" in invite_link:
                extracted = invite_link.split("t.me/")[-1]
                if not extracted.startswith("+"):
                    chat_identifier = f"@{extracted}"
                else:
                    raise ValueError(
                        "Private invite links (+hash) are not supported. Use telegram_id or public username instead.")
            else:
                raise ValueError("Invalid invite link format")

        # Если передан token, создаём/находим бота
        if token and not bot_id:
            from backend.services.bot.bots import BotService
            bot_service = BotService(self.db)
            bot_model = await bot_service.sync_bot_from_telegram(token, owner_id=owner_id)
            bot_id = bot_model.id

        # Получаем бота из базы
        bot_query = select(BotModel).where(
            BotModel.id == bot_id,
            BotModel.owner_id == owner_id
        )
        bot_result = await self.db.execute(bot_query)
        bot_model = bot_result.scalar_one_or_none()

        if not bot_model:
            raise ValueError("Bot not found or does not belong to user")

        # Используем мастер-бота для управления каналами
        bot = self.get_master_bot()

        try:
            chat: Chat = await bot.get_chat(chat_identifier)

            actual_telegram_id = chat.id

            channel_type = ChannelType.CHANNEL
            if chat.type == "group":
                channel_type = ChannelType.GROUP
            elif chat.type == "supergroup":
                channel_type = ChannelType.SUPERGROUP

            members_count = 0
            try:
                members_count = await bot.get_chat_member_count(actual_telegram_id)
            except Exception:
                pass

            photo_url = None
            photo_small_file_id = None
            photo_small_file_unique_id = None
            photo_big_file_id = None
            photo_big_file_unique_id = None

            if chat.photo:
                try:
                    photo_file = await bot.get_file(chat.photo.big_file_id)
                    photo_url = f"https://api.telegram.org/file/bot{bot_model.token}/{photo_file.file_path}"
                    photo_small_file_id = chat.photo.small_file_id
                    photo_small_file_unique_id = chat.photo.small_file_unique_id
                    photo_big_file_id = chat.photo.big_file_id
                    photo_big_file_unique_id = chat.photo.big_file_unique_id
                except Exception:
                    pass

            # Parse all ChatFullInfo fields
            chat_data = {
                "channel_type": channel_type,
                "title": chat.title or f"Channel {actual_telegram_id}",
                "username": getattr(chat, "username", None),
                "first_name": getattr(chat, "first_name", None),
                "last_name": getattr(chat, "last_name", None),
                "description": getattr(chat, "description", None),
                "invite_link": getattr(chat, "invite_link", None),
                "bio": getattr(chat, "bio", None),

                # Chat appearance
                "accent_color_id": getattr(chat, "accent_color_id", None),
                "profile_accent_color_id": getattr(chat, "profile_accent_color_id", None),
                "background_custom_emoji_id": getattr(chat, "background_custom_emoji_id", None),
                "profile_background_custom_emoji_id": getattr(chat, "profile_background_custom_emoji_id", None),
                "emoji_status_custom_emoji_id": getattr(chat, "emoji_status_custom_emoji_id", None),
                "emoji_status_expiration_date": getattr(chat, "emoji_status_expiration_date", None),

                # Chat settings/features
                "is_forum": getattr(chat, "is_forum", False),
                "is_direct_messages": getattr(chat, "is_direct_messages", False),
                "max_reaction_count": getattr(chat, "max_reaction_count", None),
                "slow_mode_delay": getattr(chat, "slow_mode_delay", None),
                "unrestrict_boost_count": getattr(chat, "unrestrict_boost_count", None),
                "message_auto_delete_time": getattr(chat, "message_auto_delete_time", None),

                # Privacy & restrictions
                "has_private_forwards": getattr(chat, "has_private_forwards", False),
                "has_restricted_voice_and_video_messages": getattr(chat, "has_restricted_voice_and_video_messages", False),
                "has_aggressive_anti_spam_enabled": getattr(chat, "has_aggressive_anti_spam_enabled", False),
                "has_hidden_members": getattr(chat, "has_hidden_members", False),
                "has_protected_content": getattr(chat, "has_protected_content", False),
                "has_visible_history": getattr(chat, "has_visible_history", False),
                "join_to_send_messages": getattr(chat, "join_to_send_messages", False),
                "join_by_request": getattr(chat, "join_by_request", False),
                "can_send_paid_media": getattr(chat, "can_send_paid_media", False),

                # Stickers
                "sticker_set_name": getattr(chat, "sticker_set_name", None),
                "can_set_sticker_set": getattr(chat, "can_set_sticker_set", False),
                "custom_emoji_sticker_set_name": getattr(chat, "custom_emoji_sticker_set_name", None),

                # Linked chats & location
                "linked_chat_id": getattr(chat, "linked_chat_id", None),
                "parent_chat_id": getattr(getattr(chat, "parent_chat", None), "id", None) if hasattr(chat,
                                                                                                     "parent_chat") else None,

                # Statistics
                "members_count": members_count,

                # Photo
                "photo_url": photo_url,
                "photo_small_file_id": photo_small_file_id,
                "photo_small_file_unique_id": photo_small_file_unique_id,
                "photo_big_file_id": photo_big_file_id,
                "photo_big_file_unique_id": photo_big_file_unique_id,

                # JSON fields
                "permissions": chat.permissions.model_dump(mode="json", exclude_defaults=True) if hasattr(chat,
                                                                                                          "permissions") and chat.permissions else None,
                "available_reactions": [r.model_dump(mode="json", exclude_defaults=True) for r in
                                        chat.available_reactions] if hasattr(chat,
                                                                             "available_reactions") and chat.available_reactions else None,
                "accepted_gift_types": chat.accepted_gift_types.model_dump(mode="json", exclude_defaults=True) if hasattr(
                    chat, "accepted_gift_types") and chat.accepted_gift_types else None,
                "active_usernames": getattr(chat, "active_usernames", None),
                "pinned_message": chat.pinned_message.model_dump(mode="json", exclude_defaults=True) if hasattr(chat,
                                                                                                                "pinned_message") and chat.pinned_message else None,

                # Business account fields
                "business_intro": chat.business_intro.model_dump(mode="json", exclude_defaults=True) if hasattr(chat,
                                                                                                                "business_intro") and chat.business_intro else None,
                "business_location": chat.business_location.model_dump(mode="json", exclude_defaults=True) if hasattr(chat,
                                                                                                                      "business_location") and chat.business_location else None,
                "business_opening_hours": chat.business_opening_hours.model_dump(mode="json",
                                                                                 exclude_defaults=True) if hasattr(chat,
                                                                                                                   "business_opening_hours") and chat.business_opening_hours else None,
                "birthdate": chat.birthdate.model_dump(mode="json", exclude_defaults=True) if hasattr(chat,
                                                                                                      "birthdate") and chat.birthdate else None,
                "personal_chat": chat.personal_chat.model_dump(mode="json", exclude_defaults=True) if hasattr(chat,
                                                                                                              "personal_chat") and chat.personal_chat else None,

                # Location
                "location_address": getattr(getattr(chat, "location", None), "address", None) if hasattr(chat,
                                                                                                         "location") and chat.location else None,
                "location_latitude": str(getattr(getattr(chat, "location", None), "location", {}).latitude) if hasattr(chat,
                                                                                                                       "location") and chat.location and hasattr(
                    chat.location, "location") else None,
                "location_longitude": str(getattr(getattr(chat, "location", None), "location", {}).longitude) if hasattr(
                    chat, "location") and chat.location and hasattr(chat.location, "location") else None,
            }

            channel = await self.get_channel_by_telegram_id(actual_telegram_id)

            if channel:
                if channel.owner_id != owner_id:
                    raise ValueError("Channel belongs to another user")

                for field, value in chat_data.items():
                    setattr(channel, field, value)

                channel.bot_id = bot_id
                channel.last_sync_at = datetime.now(timezone.utc)
                channel.updated_at = datetime.now(timezone.utc)
            else:
                channel = ChannelGroup(
                    owner_id=owner_id,
                    bot_id=bot_id,
                    telegram_id=actual_telegram_id,
                    **chat_data,
                    last_sync_at=datetime.now(timezone.utc),
                    is_active=True
                )
                self.db.add(channel)

            await self.db.commit()
            await self.db.refresh(channel)
            return channel

        except TelegramForbiddenError:
            raise ValueError("Bot doesn't have access to this channel/group")
        except TelegramBadRequest as e:
            raise ValueError(f"Invalid channel/group: {str(e)}")
        finally:
            await bot.session.close()