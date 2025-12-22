import os
from aiogram import Bot


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

# Валидация токена бота при старте
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")

bot = Bot(token=TELEGRAM_BOT_TOKEN)


def get_bot() -> Bot:
    """Получить экземпляр бота"""
    return bot


async def close_bot():
    await bot.session.close()
