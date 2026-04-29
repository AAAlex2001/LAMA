"""/ban команда — забанить пользователя."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from aiogram.exceptions import TelegramAPIError

from backend.services.bot.features.moderation.admin_helpers import reply_to_chat
from backend.services.bot.features.moderation.time_parser import parse_time
from backend.services.telegram_client import RateLimitedBot


async def ban_user(
    bot: RateLimitedBot,
    chat_id: int,
    user_id: Optional[int],
    username: Optional[str],
    parts: list,
) -> bool:
    """Возвращает True (команда обработана). Без user_id — просит указать цель."""
    if not user_id:
        await reply_to_chat(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
        return True

    minutes = parse_time(parts[-1] if len(parts) > 1 else "0")
    try:
        kwargs: dict = {"chat_id": chat_id, "user_id": user_id}
        if minutes > 0:
            kwargs["until_date"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        await bot.ban_chat_member(**kwargs)

        duration_text = f"на {minutes} минут" if minutes > 0 else "навсегда"
        await reply_to_chat(bot, chat_id, f"Пользователь {username} забанен {duration_text}")
    except TelegramAPIError as exc:
        await reply_to_chat(bot, chat_id, f"Не удалось забанить: {exc}")
    return True


