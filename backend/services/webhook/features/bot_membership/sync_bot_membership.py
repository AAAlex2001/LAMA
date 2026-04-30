import logging

from aiogram.types import ChatMemberUpdated
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.features.sync.save_synced_channel import SaveSyncedChannel
from backend.services.channel.utils.chat_data_utils import build_chat_data

logger = logging.getLogger(__name__)


class SyncBotMembership:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, my_chat_member: ChatMemberUpdated) -> None:
        chat = my_chat_member.chat
        if chat.type not in ("channel", "group", "supergroup"):
            return

        new_status = my_chat_member.new_chat_member.status
        if new_status in ("left", "kicked"):
            logger.info("Bot left/kicked from %s %s", chat.type, chat.id)
            return
        if new_status not in ("member", "administrator", "restricted", "creator"):
            return

        logger.info(
            "Bot added/promoted in %s %s with status %s",
            chat.type,
            chat.id,
            new_status,
        )
        try:
            bot = resolve_by_token(self.bot_model.token).bot
            full_chat = await bot.get_chat(chat.id)
            chat_data = await build_chat_data(bot, full_chat, self.bot_model.token)
            await SaveSyncedChannel(self.db).execute(
                telegram_id=chat.id,
                chat_data=chat_data,
                bot_id=self.bot_model.id,
                owner_id=self.bot_model.owner_id,
            )
            logger.info("Successfully auto-synced %s %s", chat.type, chat.id)
        except Exception as exc:
            logger.error("Error auto-syncing chat %s: %s", chat.id, exc, exc_info=True)
