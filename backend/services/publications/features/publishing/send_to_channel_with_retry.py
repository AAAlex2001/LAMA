"""Отправка публикации в один канал с ретраями."""

import asyncio
import logging
from typing import Optional

from aiogram.exceptions import (
    TelegramBadRequest,
    TelegramForbiddenError,
    TelegramNotFound,
    TelegramRetryAfter,
)

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication
from backend.schemas.publications import ChannelPublishResult
from backend.services.publications.features.publishing.send_to_telegram import send_to_telegram
from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

MAX_RETRY_ATTEMPTS = 3
LARGE_RETRY_AFTER_THRESHOLD = 60


async def send_to_channel_with_retry(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    channel_name: str,
    reply_map: Optional[dict] = None,
) -> ChannelPublishResult:
    """До MAX_RETRY_ATTEMPTS попыток; ретрит rate-limit, не ретрит фатальные TG-ошибки."""
    reply_to_message_id = pick_reply_to(publication, channel, reply_map)

    for attempt in range(MAX_RETRY_ATTEMPTS):
        try:
            return await try_send(publication, channel, bot, channel_name, reply_to_message_id)

        except (TelegramBadRequest, TelegramForbiddenError, TelegramNotFound) as exc:
            logger.warning(
                "Fatal Telegram error in %s: %s: %s",
                channel_name, type(exc).__name__, exc,
            )
            return failure(channel_name, str(exc), notify=True)

        except TelegramRetryAfter as exc:
            logger.warning(
                "TelegramRetryAfter in %s: retry_after=%ss, attempt=%s/%s",
                channel_name, exc.retry_after, attempt + 1, MAX_RETRY_ATTEMPTS,
            )
            if exc.retry_after > LARGE_RETRY_AFTER_THRESHOLD:
                return failure(
                    channel_name, f"Rate limit: {exc.retry_after}s",
                    notification_text=f"Failed to publish to {channel_name}: Rate limit",
                )
            await asyncio.sleep(exc.retry_after)

        except RateLimitTimeout as exc:
            logger.info("Rate limit timeout for %s: %s", channel_name, exc)
            if exc.wait_seconds <= 30 and attempt < MAX_RETRY_ATTEMPTS - 1:
                await asyncio.sleep(exc.wait_seconds)
            else:
                return failure(channel_name, f"Rate limit timeout: {exc.wait_seconds:.0f}s")

        except Exception as exc:
            logger.error(
                "Error publishing to %s, attempt=%s/%s: %s: %s",
                channel_name, attempt + 1, MAX_RETRY_ATTEMPTS, type(exc).__name__, exc,
                exc_info=True,
            )
            if attempt == MAX_RETRY_ATTEMPTS - 1:
                return failure(channel_name, str(exc), notify=True)
            await asyncio.sleep(2 ** attempt)

    return failure(channel_name, "Unknown error", notify=True)


async def try_send(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    channel_name: str,
    reply_to_message_id: Optional[int],
) -> ChannelPublishResult:
    """Один проход отправки + опциональный пин."""
    sent_messages = await send_to_telegram(
        publication, channel, bot, reply_to_message_id=reply_to_message_id,
    )
    message_ids = [msg.message_id for msg in sent_messages]
    telegram_messages_data = [
        {"publication_id": publication.id, "channel_id": channel.id, "telegram_message_id": mid}
        for mid in message_ids
    ]

    if publication.pin_message and message_ids:
        try:
            await bot.pin_chat_message(
                chat_id=channel.telegram_id, message_id=message_ids[0],
                disable_notification=True,
            )
        except Exception as exc:
            logger.warning("Failed to pin message in %s: %s", channel_name, exc)

    return ChannelPublishResult(
        channel=channel_name,
        success=True,
        message_ids=message_ids,
        telegram_messages_data=telegram_messages_data,
        sent_messages=sent_messages,
        channel_obj=channel,
    )


def pick_reply_to(
    publication: Publication, channel: Channel, reply_map: Optional[dict],
) -> Optional[int]:
    """telegram_message_id для reply_to_post_id в этом канале (или None)."""
    if publication.reply_to_post_id and reply_map:
        return reply_map.get(channel.id)
    return None


def failure(
    channel_name: str,
    error: str,
    *,
    notify: bool = False,
    notification_text: Optional[str] = None,
) -> ChannelPublishResult:
    """Краткий конструктор отрицательного результата."""
    notification = notification_text
    if notification is None and notify:
        notification = f"Failed to publish to {channel_name}: {error}" if error != "Unknown error" else (
            f"Failed to publish to {channel_name}: Unknown error"
        )
    return ChannelPublishResult(
        channel=channel_name,
        success=False,
        error=error,
        notification_error=notification,
    )
