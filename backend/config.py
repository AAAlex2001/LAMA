import os
from aiogram import Bot

from backend.services.telegram_client import RateLimitedBot


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

# Валидация токена бота при старте
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")

# Создаём глобальный aiogram Bot и оборачиваем его в RateLimitedBot
raw_bot = Bot(token=TELEGRAM_BOT_TOKEN)
rate_limited_bot = RateLimitedBot(raw_bot)


def get_bot() -> RateLimitedBot:
    """Получить экземпляр бота (RateLimitedBot)"""
    return rate_limited_bot


async def close_bot():
    await raw_bot.session.close()
