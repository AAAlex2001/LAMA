import logging
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel

logger = logging.getLogger(__name__)


class BaseCallbackProcessor:
    """Базовый класс для обработчиков callback-запросов."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def answer_callback(
        self, bot, callback_id: str, text: str, show_alert: bool = False
    ) -> None:
        """Ответить на callback query."""
        try:
            await bot.answer_callback_query(
                callback_id, text=text, show_alert=show_alert
            )
        except TelegramAPIError as e:
            if "query is too old" not in str(e):
                logger.warning(f"Failed to answer callback: {e}")
