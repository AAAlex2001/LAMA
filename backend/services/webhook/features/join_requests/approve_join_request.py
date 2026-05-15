import logging

from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)


class ApproveJoinRequest:
    """approve_chat_join_request с проверкой бот-канал."""

    async def execute(self, telegram_bot, chat_id: int, user_id: int) -> bool:
        try:
            await telegram_bot.approve_chat_join_request(
                chat_id=chat_id,
                user_id=user_id,
            )
            logger.info("Approved join request: user=%s, chat=%s", user_id, chat_id)
            return True
        except TelegramAPIError as exc:
            logger.warning("Approve join request failed: %s", exc)
            return False
