import logging

from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)


class DeleteCaptcha:
    """Удаляет captcha-сообщение в TG (глушит ошибки aiogram)."""

    async def execute(self, bot, message) -> None:
        if not message:
            return
        try:
            await bot.delete_message(
                chat_id=message.chat.id,
                message_id=message.message_id,
            )
        except TelegramAPIError as exc:
            logger.debug("Failed to delete captcha message: %s", exc)
