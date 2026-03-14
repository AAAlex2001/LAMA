"""Отправка в каналы с retry-логикой и батчингом."""

from typing import List, Dict
import asyncio
import logging

from aiogram.exceptions import (
    TelegramBadRequest,
    TelegramForbiddenError,
    TelegramNotFound,
    TelegramRetryAfter,
)

from backend.models.publications import Publication
from backend.models.channels import ChannelGroup as Channel
from backend.schemas.publications import ChannelPublishResult
from backend.services.telegram_client import RateLimitedBot
from backend.services.publications.telegram_sender import send_to_telegram

logger = logging.getLogger(__name__)

MAX_RETRY_ATTEMPTS = 5
LARGE_RETRY_AFTER_THRESHOLD = 60


async def process_batch(
    publication: Publication,
    batch_channels: List[Channel],
    batch_num: int,
    get_bot_callback,
    reply_map: Dict[int, int] = None,
) -> List[ChannelPublishResult]:
    """Обработать батч каналов."""
    logger.info("Processing batch %s: %s channels", batch_num, len(batch_channels))

    tasks = [
        safe_send_to_channel(publication, channel, get_bot_callback, reply_map)
        for channel in batch_channels
    ]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for i, result in enumerate(raw_results):
        if isinstance(result, BaseException):
            channel = batch_channels[i]
            channel_name = getattr(channel, "title", str(channel.telegram_id))
            logger.error("Exception for channel %s: %s", channel_name, result)
            results.append(ChannelPublishResult(channel=channel_name, success=False, error=str(result)))
        else:
            results.append(result)

    return results


async def safe_send_to_channel(
    publication: Publication,
    channel: Channel,
    get_bot_callback,
    reply_map: dict = None,
) -> ChannelPublishResult:
    """Безопасная отправка в канал с обработкой ошибок."""
    channel_name = getattr(channel, "title", getattr(channel, "name", str(channel.telegram_id)))

    try:
        bot = await get_bot_callback(channel)
    except ValueError as e:
        return ChannelPublishResult(
            channel=channel_name, success=False, error=str(e),
            notification_error=f"Failed to publish to {channel_name}: {str(e)}",
        )

    return await send_to_channel_with_retry(publication, channel, bot, channel_name, reply_map)


async def send_to_channel_with_retry(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    channel_name: str,
    reply_map: dict = None,
) -> ChannelPublishResult:
    """Отправить в канал с повторными попытками."""
    reply_to_message_id = None
    if publication.reply_to_post_id and reply_map:
        reply_to_message_id = reply_map.get(channel.id)

    for attempt in range(MAX_RETRY_ATTEMPTS):
        try:
            sent_messages = await send_to_telegram(publication, channel, bot, reply_to_message_id=reply_to_message_id)

            message_ids = [msg.message_id for msg in sent_messages]
            telegram_messages_data = [
                {"publication_id": publication.id, "channel_id": channel.id, "telegram_message_id": msg_id}
                for msg_id in message_ids
            ]

            if publication.pin_message and message_ids:
                try:
                    await bot.pin_chat_message(
                        chat_id=channel.telegram_id, message_id=message_ids[0],
                        disable_notification=True,
                    )
                except Exception as e:
                    logger.warning("Failed to pin message in %s: %s", channel_name, e)

            return ChannelPublishResult(
                channel=channel_name, success=True, message_ids=message_ids,
                telegram_messages_data=telegram_messages_data,
                sent_messages=sent_messages, channel_obj=channel,
            )

        except (TelegramBadRequest, TelegramForbiddenError, TelegramNotFound) as e:
            logger.warning(
                "Fatal Telegram error in %s: %s: %s",
                channel_name, type(e).__name__, str(e),
            )
            return ChannelPublishResult(
                channel=channel_name, success=False, error=str(e),
                notification_error=f"Failed to publish to {channel_name}: {str(e)}",
            )

        except TelegramRetryAfter as e:
            logger.warning(
                "TelegramRetryAfter in %s: retry_after=%ss, attempt=%s/%s",
                channel_name, e.retry_after, attempt + 1, MAX_RETRY_ATTEMPTS,
            )
            if attempt < MAX_RETRY_ATTEMPTS - 1:
                if e.retry_after > LARGE_RETRY_AFTER_THRESHOLD:
                    return ChannelPublishResult(
                        channel=channel_name, success=False,
                        error=f"Rate limit too high: {e.retry_after}s. Try again later.",
                        notification_error=f"Failed to publish to {channel_name}: Rate limit",
                    )
                await asyncio.sleep(e.retry_after)
            else:
                return ChannelPublishResult(
                    channel=channel_name, success=False, error=f"Rate limit: {e.retry_after}s",
                    notification_error=f"Failed to publish to {channel_name}: Rate limit",
                )

        except Exception as e:
            logger.error(
                "Error publishing to %s, attempt=%s/%s: %s: %s",
                channel_name, attempt + 1, MAX_RETRY_ATTEMPTS, type(e).__name__, str(e),
                exc_info=True,
            )
            if attempt == MAX_RETRY_ATTEMPTS - 1:
                return ChannelPublishResult(
                    channel=channel_name, success=False, error=str(e),
                    notification_error=f"Failed to publish to {channel_name}",
                )
            await asyncio.sleep(2 ** attempt)

    return ChannelPublishResult(
        channel=channel_name, success=False, error="Unknown error",
        notification_error=f"Failed to publish to {channel_name}: Unknown error",
    )
