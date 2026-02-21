from aiogram import Bot

from backend.config import get_bot


def get_master_bot() -> Bot:
    """Получить мастер-бота."""
    return get_bot()
