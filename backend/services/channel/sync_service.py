from datetime import datetime, timezone
from typing import Optional

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import TelegramAccount
from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup
from backend.services.bot import BotService
from backend.services.channel.utils.chat_data_utils import build_chat_data
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id


class SyncService:
    """Синхронизация каналов через Telegram API."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_from_telegram(
        self,
        telegram_id: Optional[int] = None,
        username: Optional[str] = None,
        invite_link: Optional[str] = None,
        owner_id: int = None,
        bot_id: Optional[int] = None,
        token: Optional[str] = None,
    ) -> ChannelGroup:
        """Синхронизировать канал через Telegram API."""
        if not bot_id and not token:
            raise ValueError("Either bot_id or token must be provided")
        if not telegram_id and not username and not invite_link:
            raise ValueError("One of telegram_id, username, or invite_link must be provided")

        chat_identifier = resolve_chat_identifier(telegram_id, username, invite_link)

        if token and not bot_id:
            bot_service = BotService(self.db)
            bot_model = await bot_service.sync_from_telegram(token, owner_id=owner_id)
            bot_id = bot_model.id

        bot_model = await self.get_bot_model(bot_id, owner_id)
        user_telegram_id = await self.get_user_telegram_id(owner_id)
        bot = Bot(token=bot_model.token)

        try:
            await validate_access(bot, chat_identifier, bot_model.telegram_id, user_telegram_id)
            chat = await bot.get_chat(chat_identifier)
            chat_data = await build_chat_data(bot, chat, bot_model.token)
            return await self.save_synced_channel(chat.id, chat_data, bot_id, owner_id)
        except TelegramForbiddenError:
            raise ValueError("Bot doesn't have access to this channel/group")
        except TelegramBadRequest as e:
            raise ValueError(f"Invalid channel/group: {str(e)}")
        finally:
            await bot.session.close()

    async def get_bot_model(self, bot_id: int, owner_id: int) -> BotModel:
        """Получить модель бота из БД."""
        query = select(BotModel).where(BotModel.id == bot_id, BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        bot_model = result.scalar_one_or_none()
        if not bot_model:
            raise ValueError("Bot not found or does not belong to user")
        return bot_model

    async def get_user_telegram_id(self, owner_id: int) -> int:
        """Получить Telegram ID пользователя."""
        query = select(TelegramAccount.telegram_id).where(TelegramAccount.user_id == owner_id)
        result = await self.db.execute(query)
        user_telegram_id = result.scalar_one_or_none()
        if not user_telegram_id:
            raise ValueError("User has no linked Telegram account")
        return user_telegram_id

    async def save_synced_channel(
        self, telegram_id: int, chat_data: dict, bot_id: int, owner_id: int,
    ) -> ChannelGroup:
        """Сохранить или обновить синхронизированный канал."""
        channel = await get_channel_by_telegram_id(self.db, telegram_id)

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
                telegram_id=telegram_id,
                **chat_data,
                last_sync_at=datetime.now(timezone.utc),
                is_active=True,
            )
            self.db.add(channel)

        await self.db.commit()
        await self.db.refresh(channel)
        return channel


def resolve_chat_identifier(
    telegram_id: Optional[int],
    username: Optional[str],
    invite_link: Optional[str],
):
    """Определить идентификатор чата."""
    if telegram_id:
        return telegram_id
    if username:
        return username if username.startswith("@") else f"@{username}"
    if invite_link and "t.me/" in invite_link:
        extracted = invite_link.split("t.me/")[-1]
        if extracted.startswith("+"):
            raise ValueError("Private invite links (+hash) are not supported")
        return f"@{extracted}"
    raise ValueError("Invalid invite link format")


async def validate_access(bot: Bot, chat_identifier, bot_telegram_id: int, user_telegram_id: int):
    """Проверить доступ бота и пользователя к чату."""
    bot_member = await bot.get_chat_member(chat_identifier, bot_telegram_id)
    if bot_member.status in ["left", "kicked"]:
        raise ValueError("Bot is not a member of this channel/group")

    user_member = await bot.get_chat_member(chat_identifier, user_telegram_id)
    if user_member.status not in ["administrator", "creator"]:
        raise ValueError("User is not an admin in this channel/group")
