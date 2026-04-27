import asyncio
from typing import Optional

from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import TELEGRAM_BOT_TOKEN
from backend.models.channels import ChannelGroup
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.features.sync.get_owned_bot import GetOwnedBot
from backend.services.channel.features.sync.get_user_telegram_id import GetUserTelegramId
from backend.services.channel.features.sync.resolve_chat_identifier import resolve_chat_identifier
from backend.services.channel.features.sync.save_synced_channel import SaveSyncedChannel
from backend.services.channel.features.sync.validate_access import ValidateChatAccess
from backend.services.channel.utils.chat_data_utils import build_chat_data


class SyncChannelFromTelegram:
    """Подтягивает данные канала из Telegram API и сохраняет в БД."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        telegram_id: Optional[int] = None,
        username: Optional[str] = None,
        invite_link: Optional[str] = None,
        bot_id: Optional[int] = None,
        token: Optional[str] = None,
    ) -> ChannelGroup:
        """Возвращает синхронизированный ChannelGroup."""
        chat_identifier = resolve_chat_identifier(telegram_id, username, invite_link)

        if not bot_id:
            bot_token = token or TELEGRAM_BOT_TOKEN
            synced_bot = await BotCrudService(self.db).sync_from_telegram(bot_token, owner_id=owner_id)
            bot_id = synced_bot.id

        bot_model, user_telegram_id = await asyncio.gather(
            GetOwnedBot(self.db).execute(bot_id, owner_id),
            GetUserTelegramId(self.db).execute(owner_id),
        )
        raw_bot = resolve_by_token(bot_model.token).bot

        try:
            _, chat = await asyncio.gather(
                ValidateChatAccess(raw_bot).execute(chat_identifier, bot_model.telegram_id, user_telegram_id),
                raw_bot.get_chat(chat_identifier),
            )
            chat_data = await build_chat_data(raw_bot, chat, bot_model.token)
            return await SaveSyncedChannel(self.db).execute(chat.id, chat_data, bot_id, owner_id)
        except TelegramForbiddenError:
            raise HTTPException(status_code=403, detail="Bot doesn't have access to this channel/group")
        except TelegramBadRequest as exc:
            raise HTTPException(status_code=400, detail=f"Invalid channel/group: {exc}")
