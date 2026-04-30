import asyncio
import logging

from aiogram.exceptions import TelegramAPIError

from backend.services.webhook.types import TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class CheckSubscriber:
    async def execute(self, bot, chat_id: int, user_id: int) -> bool:
        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(chat_id, user_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            return member.status in ("member", "administrator", "creator")
        except (TelegramAPIError, asyncio.TimeoutError):
            logger.warning("Check subscriber failed", exc_info=True)
            return False
