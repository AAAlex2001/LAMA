"""Установка/снятие вебхука + URL-конструктор."""

import asyncio
import logging
from typing import Optional

from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from fastapi import HTTPException

from backend.config import TELEGRAM_WEBHOOK_SECRET, WEBHOOK_DOMAIN
from backend.services.bot_provider import evict_bot, resolve_by_token
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

WEBHOOK_ALLOWED_UPDATES = [
    "message",
    "edited_message",
    "channel_post",
    "edited_channel_post",
    "inline_query",
    "chosen_inline_result",
    "callback_query",
    "shipping_query",
    "pre_checkout_query",
    "poll",
    "poll_answer",
    "my_chat_member",
    "chat_member",
    "chat_join_request",
]

DNS_ERROR_MARKERS = ("failed to resolve host", "temporary failure")
DNS_RETRY_ATTEMPTS = 2


def build_webhook_url(token: str) -> str:
    """Полный URL вебхука для бота."""
    return f"{WEBHOOK_DOMAIN.rstrip('/')}/api/telegram/webhook/{token}"


async def setup_webhook(bot: RateLimitedBot, token: str) -> None:
    """Установить вебхук; при DNS-ошибке Telegram — один ретрай через 2с."""
    webhook_url = build_webhook_url(token)

    if await is_webhook_already_set(bot, webhook_url):
        return

    last_error: Optional[Exception] = None
    for attempt in range(DNS_RETRY_ATTEMPTS):
        try:
            await bot.set_webhook(
                url=webhook_url,
                secret_token=TELEGRAM_WEBHOOK_SECRET or None,
                allowed_updates=WEBHOOK_ALLOWED_UPDATES,
            )
            return
        except TelegramBadRequest as exc:
            last_error = exc
            if not is_dns_error(exc):
                raise HTTPException(
                    status_code=400, detail=f"Telegram отклонил вебхук: {exc}",
                )
            logger.warning(
                "setWebhook DNS issue (attempt %s), retrying: %s", attempt + 1, exc,
            )
            await asyncio.sleep(2)

    raise HTTPException(
        status_code=502,
        detail=(
            f"Telegram сейчас не может зарезолвить домен вебхука "
            f"({WEBHOOK_DOMAIN}). Попробуйте ещё раз через минуту. "
            f"Последняя ошибка: {last_error}"
        ),
    )


async def is_webhook_already_set(bot: RateLimitedBot, target_url: str) -> bool:
    """True если у бота уже стоит target_url; False при ошибке (тогда set попытается)."""
    try:
        current = await bot.get_webhook_info()
        return bool(current and current.url == target_url)
    except TelegramAPIError as exc:
        logger.warning("get_webhook_info failed, proceed to set: %s", exc)
        return False


def is_dns_error(exc: Exception) -> bool:
    """True если ошибка похожа на временный DNS-сбой Telegram."""
    msg = str(exc).lower()
    return any(marker in msg for marker in DNS_ERROR_MARKERS)


async def remove_webhook(token: str) -> None:
    """delete_webhook(drop_pending_updates=True); ошибки только логируются."""
    try:
        raw_bot = resolve_by_token(token).bot
        await raw_bot.delete_webhook(drop_pending_updates=True)
    except TelegramAPIError as exc:
        logger.warning("Failed to remove webhook: %s", exc)


async def evict_from_cache(token: str) -> None:
    """Закрыть aiohttp-сессию и удалить из всех кешей провайдера."""
    await evict_bot(token)
