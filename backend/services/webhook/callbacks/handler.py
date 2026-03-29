import logging
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.webhook.callbacks.captcha import CaptchaCallbackProcessor
from backend.services.webhook.callbacks.admin import AdminCallbackProcessor
from backend.services.webhook.callbacks.posts import PostsCallbackProcessor
from backend.services.webhook.callbacks.bot_commands import BotCommandsCallbackProcessor

logger = logging.getLogger(__name__)


class CallbackHandler:
    """Обработчик callback query от Telegram. Маршрутизация."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

        self.captcha_processor = CaptchaCallbackProcessor(db, bot_model)
        self.admin_processor = AdminCallbackProcessor(db, bot_model)
        self.posts_processor = PostsCallbackProcessor(db, bot_model)
        self.command_processor = BotCommandsCallbackProcessor(db, bot_model)

    async def process(self, callback_query: CallbackQuery) -> None:
        """Роутинг callback query по префиксу."""
        callback_data = callback_query.data
        if not callback_data:
            return

        routes = (
            ("group_captcha_", self.captcha_processor.process_group_captcha),
            ("captcha_", self.captcha_processor.process_captcha),
            ("admincall_", self.admin_processor.process_admin_call_action),
            ("hidden_text:", self.posts_processor.process_hidden_text),
            ("callback:", self.posts_processor.process_callback_action),
            ("cmd_hidden:", self.command_processor.process_hidden_text),
            ("cmd_callback:", self.command_processor.process_callback_action),
        )
        for prefix, handler in routes:
            if callback_data.startswith(prefix):
                await handler(callback_query)
                return
