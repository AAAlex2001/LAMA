import asyncio
import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message

from backend.services.webhook.types import TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class CheckModerationAdmin:
    async def execute(self, bot, message: Message) -> bool:
        if not message.from_user:
            return False

        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(message.chat.id, message.from_user.id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            return member.status in ("creator", "administrator")
        except TelegramAPIError as exc:
            text = str(exc)
            if "can't remove chat owner" in text or "user is an administrator" in text:
                return True
            logger.debug("Failed to check member status: %s", exc)
        except asyncio.TimeoutError:
            logger.debug("Member status check timeout")
        return False
