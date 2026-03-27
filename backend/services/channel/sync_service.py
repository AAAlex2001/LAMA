from datetime import datetime, timezone
from typing import Optional

import asyncio
from aiogram import Bot
from backend.services.telegram_client import RateLimitedBot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import TELEGRAM_BOT_TOKEN
from backend.models.auth import TelegramAccount
from backend.models.bots import Bot as BotModel
from backend.models.channels import ChannelGroup
from backend.services.bot import BotService
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.utils.chat_data_utils import build_chat_data
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.channel.forum_topic_service import ForumTopicService


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
            token = TELEGRAM_BOT_TOKEN
        if not telegram_id and not username and not invite_link:
            raise HTTPException(status_code=400, detail="One of telegram_id, username, or invite_link must be provided")

        chat_identifier = resolve_chat_identifier(telegram_id, username, invite_link)

        if token and not bot_id:
            bot_service = BotService(self.db)
            bot_model = await bot_service.sync_from_telegram(token, owner_id=owner_id)
            bot_id = bot_model.id

        bot_model, user_telegram_id = await asyncio.gather(
            self.get_bot_model(bot_id, owner_id),
            self.get_user_telegram_id(owner_id),
        )
        rate_limited_bot = resolve_by_token(bot_model.token)
        raw_bot = rate_limited_bot.bot

        try:
            _, chat = await asyncio.gather(
                validate_access(raw_bot, chat_identifier, bot_model.telegram_id, user_telegram_id),
                raw_bot.get_chat(chat_identifier),
            )
            chat_data = await build_chat_data(raw_bot, chat, bot_model.token)
            channel = await self.save_synced_channel(chat.id, chat_data, bot_id, owner_id)
            if chat_data.get("is_forum"):
                topic_service = ForumTopicService(self.db)
                await topic_service.ensure_general_topic(channel.id)
            return channel
        except TelegramForbiddenError:
            raise HTTPException(status_code=403, detail="Bot doesn't have access to this channel/group")
        except TelegramBadRequest as e:
            raise HTTPException(status_code=400, detail=f"Invalid channel/group: {str(e)}")

    async def get_bot_model(self, bot_id: int, owner_id: int) -> BotModel:
        """Получить модель бота из БД."""
        query = select(BotModel).where(BotModel.id == bot_id, BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        bot_model = result.scalar_one_or_none()
        if not bot_model:
            raise HTTPException(status_code=404, detail="Bot not found or does not belong to user")
        return bot_model

    async def get_user_telegram_id(self, owner_id: int) -> int:
        """Получить Telegram ID пользователя."""
        query = select(TelegramAccount.telegram_id).where(TelegramAccount.user_id == owner_id)
        result = await self.db.execute(query)
        user_telegram_id = result.scalar_one_or_none()
        if not user_telegram_id:
            raise HTTPException(status_code=400, detail="User has no linked Telegram account")
        return user_telegram_id

    async def save_synced_channel(
        self, telegram_id: int, chat_data: dict, bot_id: int, owner_id: int,
    ) -> ChannelGroup:
        """Сохранить или обновить синхронизированный канал."""
        channel = await get_channel_by_telegram_id(self.db, telegram_id)

        if channel:
            if channel.owner_id != owner_id:
                raise HTTPException(status_code=403, detail="Channel belongs to another user")
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

        await self.db.flush()
        await self.db.refresh(channel)

        if channel.is_forum:
            topic_service = ForumTopicService(self.db)
            await topic_service.ensure_general_topic(channel.id)

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
        if extracted.startswith("+") or extracted.startswith("joinchat/"):
            raise HTTPException(
                status_code=400,
                detail="Private invite links are not supported by Telegram API. Add the bot to the channel/group as an administrator and it will appear automatically."
            )
        return f"@{extracted}"
    if invite_link:
        raise HTTPException(
            status_code=400,
            detail="Unsupported link format. Use a public username (@username) or t.me/username."
        )


async def validate_access(bot: RateLimitedBot, chat_identifier, bot_telegram_id: int, user_telegram_id: int):
    """Проверить доступ бота и пользователя к чату."""
    try:
        bot_member, user_member = await asyncio.gather(
            bot.get_chat_member(chat_identifier, bot_telegram_id),
            bot.get_chat_member(chat_identifier, user_telegram_id),
        )
        if bot_member.status in ["left", "kicked"]:
            raise HTTPException(status_code=403, detail="Bot is not a member of this channel/group")
        if user_member.status not in ["administrator", "creator"]:
            raise HTTPException(status_code=403, detail="User is not an admin in this channel/group")
        return
    except TelegramBadRequest as exc:
        if "member list is inaccessible" not in str(exc).lower():
            raise

    administrators = await bot.get_chat_administrators(chat_identifier)
    admin_ids = {admin.user.id for admin in administrators}

    if bot_telegram_id not in admin_ids:
        raise HTTPException(status_code=403, detail="Bot is not an admin of this channel/group")

    if user_telegram_id not in admin_ids:
        raise HTTPException(status_code=403, detail="User is not an admin in this channel/group")
