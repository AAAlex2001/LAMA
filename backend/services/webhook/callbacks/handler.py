import logging
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.webhook.callbacks.captcha import CaptchaCallbackProcessor
from backend.services.webhook.callbacks.admin import AdminCallbackProcessor
from backend.services.webhook.callbacks.posts import PostsCallbackProcessor

logger = logging.getLogger(__name__)


class CallbackHandler:
    """Обработчик callback query от Telegram. Маршрутизация."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

        self.captcha_processor = CaptchaCallbackProcessor(db, bot_model)
        self.admin_processor = AdminCallbackProcessor(db, bot_model)
        self.posts_processor = PostsCallbackProcessor(db, bot_model)

    async def process(self, callback_query: CallbackQuery) -> None:
        """Роутинг callback query по префиксу."""
        callback_data = callback_query.data
        if not callback_data:
            return

        if callback_data.startswith("captcha_"):
            await self.captcha_processor.process_captcha(callback_query)
        elif callback_data.startswith("group_captcha_"):
            await self.captcha_processor.process_group_captcha(callback_query)
        elif callback_data.startswith("admincall_"):
            await self.admin_processor.process_admin_call_action(
                callback_query
            )
        elif callback_data.startswith("hidden_text:"):
            await self.posts_processor.process_hidden_text(callback_query)
        elif callback_data.startswith("callback:"):
            await self.posts_processor.process_callback_action(callback_query)
