"""TG-API запросы для получения метаданных бота."""

import asyncio
from typing import Optional

from aiogram.exceptions import TelegramAPIError
from aiogram.utils.token import TokenValidationError
from fastapi import HTTPException

from backend.services.bot_provider import resolve_by_token
from backend.services.telegram_client import RateLimitedBot


async def fetch_bot_info(token: str) -> tuple:
    """get_me + параллельно описание/короткое описание (None если ошибка). Бросает 400 при невалидном токене."""
    try:
        raw_bot = resolve_by_token(token).bot
    except TokenValidationError:
        raise HTTPException(status_code=400, detail="Неверный формат токена бота")

    try:
        bot_info = await raw_bot.get_me()
        description, short_description = await asyncio.gather(
            safe_get_description(raw_bot),
            safe_get_short_description(raw_bot),
        )
        return bot_info, description, short_description
    except TelegramAPIError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid bot token: {exc}")


async def safe_get_description(bot: RateLimitedBot) -> Optional[str]:
    """get_my_description; None при любой ошибке."""
    try:
        info = await bot.get_my_description()
        return info.description if info and info.description else None
    except TelegramAPIError:
        return None


async def safe_get_short_description(bot: RateLimitedBot) -> Optional[str]:
    """get_my_short_description; None при любой ошибке."""
    try:
        info = await bot.get_my_short_description()
        return info.short_description if info and info.short_description else None
    except TelegramAPIError:
        return None
