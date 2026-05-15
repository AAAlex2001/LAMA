import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.tasks import delayed_delete_message
from backend.models.bots import Bot as BotModel
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id

logger = logging.getLogger(__name__)


class SendCaptchaSuccessText:
    """Отправляет success-сообщение после успешной капчи."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, bot, chat_id: int, user) -> None:
        try:
            channel = await get_channel_by_telegram_id(
                self.db,
                chat_id,
                bot_id=self.bot_model.id,
            )
            if not channel or not channel.captcha_message_success:
                return

            text = ShortcodeProcessor.process(
                channel.captcha_message_success,
                {
                    "user": {
                        "first_name": user.first_name or "",
                        "username": user.username or "",
                        "last_name": user.last_name or "",
                        "id": user.id,
                    },
                },
            )
            message = await bot.send_message(chat_id=chat_id, text=text)
            delayed_delete_message.apply_async(
                args=[self.bot_model.id, chat_id, message.message_id],
                countdown=30,
            )
        except Exception as exc:
            logger.error("Failed to send captcha success text: %s", exc)
