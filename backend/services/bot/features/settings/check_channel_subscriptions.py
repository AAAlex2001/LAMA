"""Параллельная проверка подписок пользователя на список каналов через TG."""

import asyncio
from typing import Optional

from aiogram.exceptions import TelegramAPIError

from backend.models.bots import Bot as BotModel
from backend.services.bot_provider import resolve_for_bot_model

ALLOWED_STATUSES = ("member", "administrator", "creator")


async def check_channel_subscriptions(
    bot: BotModel, user_id: int, required_channels: list[int],
) -> tuple[bool, list[int]]:
    """(all_subscribed, missing_channel_ids); ошибки TG считаются как 'не подписан'."""
    telegram_bot = await resolve_for_bot_model(bot)

    results = await asyncio.gather(
        *(check_one_channel(telegram_bot, channel_id, user_id) for channel_id in required_channels),
        return_exceptions=True,
    )
    missing = [r for r in results if isinstance(r, int)]
    return (not missing), missing


async def check_one_channel(telegram_bot, channel_id: int, user_id: int) -> Optional[int]:
    """Возвращает channel_id если пользователь не подписан; None если подписан."""
    try:
        member = await telegram_bot.get_chat_member(channel_id, user_id)
        if member.status not in ALLOWED_STATUSES:
            return channel_id
    except TelegramAPIError:
        return channel_id
    return None
