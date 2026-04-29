"""Проверка что пользователь — администратор/создатель чата."""

from aiogram.exceptions import TelegramAPIError

from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot

ADMIN_STATUSES = ("administrator", "creator")


async def check_is_admin(bot: RateLimitedBot, chat_id: int, user_id: int) -> bool:
    """True если status ∈ {administrator, creator}; False при ошибках TG/rate-limit."""
    try:
        member = await bot.get_chat_member(chat_id, user_id)
        return member.status in ADMIN_STATUSES
    except (TelegramAPIError, RateLimitTimeout):
        return False


async def find_group_owner(bot: RateLimitedBot, chat_id: int):
    """Создатель группы (status=creator) или None."""
    admins = await bot.get_chat_administrators(chat_id)
    for admin in admins:
        if admin.status == "creator":
            return admin.user
    return None
