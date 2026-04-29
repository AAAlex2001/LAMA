"""/unban command action."""

from typing import Optional

from aiogram.exceptions import TelegramAPIError

from backend.services.bot.features.moderation.admin_helpers import reply_to_chat
from backend.services.telegram_client import RateLimitedBot


async def unban_user(
    bot: RateLimitedBot,
    chat_id: int,
    user_id: Optional[int],
    username: Optional[str],
) -> bool:
    """Unban target user, returning True because command was handled."""
    if not user_id:
        await reply_to_chat(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
        return True
    try:
        await bot.unban_chat_member(chat_id=chat_id, user_id=user_id)
        await reply_to_chat(bot, chat_id, f"Пользователь {username} разбанен")
    except TelegramAPIError as exc:
        await reply_to_chat(bot, chat_id, f"Не удалось разбанить: {exc}")
    return True