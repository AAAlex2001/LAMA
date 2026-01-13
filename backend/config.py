import os
from aiogram import Bot

from backend.services.telegram_client import RateLimitedBot


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

# Cloud Storage (S3-compatible: AWS S3, Yandex Object Storage, DigitalOcean Spaces, Cloudflare R2)
USE_CLOUD_STORAGE = os.getenv("USE_CLOUD_STORAGE", "false").lower() == "true"
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "")  # Например: https://storage.yandexcloud.net
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
CDN_URL = os.getenv("CDN_URL", "")  # Публичный URL CDN, например: https://cdn.lamaplanner.com

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
