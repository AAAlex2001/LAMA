import os
from aiogram import Bot


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

bot = Bot(token=TELEGRAM_BOT_TOKEN)


async def close_bot():
    await bot.session.close()

