import asyncio
import logging

from aiogram.exceptions import TelegramBadRequest
from fastapi import HTTPException

from backend.config import TELEGRAM_WEBHOOK_SECRET, WEBHOOK_DOMAIN
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.settings.get_webhook_info import (
    GetWebhookInfo,
)

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


class SetWebhook:
    async def execute(self, token: str) -> str:
        bot = resolve_by_token(token).bot
        webhook_url = self.get_url(token)
        current = await GetWebhookInfo().execute(bot)
        if current and current.url == webhook_url:
            return webhook_url

        last_error: Exception | None = None
        for attempt in range(DNS_RETRY_ATTEMPTS):
            try:
                await bot.set_webhook(
                    url=webhook_url,
                    secret_token=TELEGRAM_WEBHOOK_SECRET or None,
                    allowed_updates=WEBHOOK_ALLOWED_UPDATES,
                )
                return webhook_url
            except TelegramBadRequest as exc:
                last_error = exc
                if not self.is_dns_error(exc):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Telegram отклонил webhook: {exc}",
                    ) from exc
                logger.warning(
                    "setWebhook DNS issue (attempt %s), retrying: %s",
                    attempt + 1,
                    exc,
                )
                await asyncio.sleep(2)

        raise HTTPException(
            status_code=502,
            detail=(
                f"Telegram сейчас не может разрешить домен webhook ({WEBHOOK_DOMAIN}). "
                f"Попробуйте еще раз через минуту. Последняя ошибка: {last_error}"
            ),
        )

    @staticmethod
    def get_url(token: str) -> str:
        return f"{WEBHOOK_DOMAIN.rstrip('/')}/api/telegram/webhook/{token}"

    @staticmethod
    def is_dns_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return any(marker in message for marker in DNS_ERROR_MARKERS)
