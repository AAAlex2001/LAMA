import logging
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.types import ChatMemberUpdated

from backend.models.bots import Bot as BotModel
from backend.services.channel.sync_service import SyncService
from backend.services.channel.utils.chat_data_utils import build_chat_data
from backend.services.bot_provider import get_cached_bot

logger = logging.getLogger(__name__)

class MyChatMemberHandler:
    """Обработчик событий my_chat_member (добавление бота в группу/канал)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def process(self, my_chat_member: ChatMemberUpdated) -> None:
        """Обработать изменение статуса бота в чате."""
        chat = my_chat_member.chat
        if chat.type not in ["channel", "group", "supergroup"]:
            return

        new_status = my_chat_member.new_chat_member.status

        if new_status in ["left", "kicked"]:
            logger.info(f"Bot left/kicked from {chat.type} {chat.id}")
            return

        if new_status in ["member", "administrator", "restricted", "creator"]:
            logger.info(f"Bot added/promoted in {chat.type} {chat.id} with status {new_status}")
            try:
                sync_service = SyncService(self.db)
                
                rate_limited_bot = get_cached_bot(self.bot_model.token)
                bot = rate_limited_bot.bot
                
                full_chat = await bot.get_chat(chat.id)
                chat_data = await build_chat_data(bot, full_chat, self.bot_model.token)
                
                await sync_service.save_synced_channel(
                    telegram_id=chat.id,
                    chat_data=chat_data,
                    bot_id=self.bot_model.id,
                    owner_id=self.bot_model.owner_id
                )
                logger.info(f"Successfully auto-synced {chat.type} {chat.id}")

            except Exception as e:
                logger.error(f"Error auto-syncing chat {chat.id}: {e}", exc_info=True)
