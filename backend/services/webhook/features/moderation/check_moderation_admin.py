import logging

from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)


class CheckModerationAdmin:
    """Проверить, является ли пользователь админом или владельцем чата."""

    async def execute(self, bot, chat_id: int, user_id: int) -> bool:
        try:
            member = await bot.get_chat_member(chat_id, user_id)
            return member.status in ("creator", "administrator")
        except TelegramAPIError as exc:
            text = str(exc)
            if "can't remove chat owner" in text or "user is an administrator" in text:
                return True
            logger.debug("Failed to check member status: %s", exc)
            return False
