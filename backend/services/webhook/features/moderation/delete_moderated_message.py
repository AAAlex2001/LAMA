import asyncio
import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message

from backend.services.webhook.types import TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class DeleteModeratedMessage:
    async def execute(self, bot, message: Message) -> None:
        try:
            await asyncio.wait_for(
                bot.delete_message(
                    chat_id=message.chat.id,
                    message_id=message.message_id,
                ),
                timeout=TELEGRAM_API_TIMEOUT,
            )
        except (TelegramAPIError, asyncio.TimeoutError) as exc:
            logger.debug("Failed to delete message: %s", exc)
