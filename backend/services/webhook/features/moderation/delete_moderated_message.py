import logging

from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)


class DeleteModeratedMessage:
    """Удалить сообщение в чате, отмодерированное автомодерацией."""

    async def execute(self, bot, chat_id: int, message_id: int) -> None:
        try:
            await bot.delete_message(chat_id=chat_id, message_id=message_id)
        except TelegramAPIError as exc:
            logger.debug("Failed to delete moderated message: %s", exc)
