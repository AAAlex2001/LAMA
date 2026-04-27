"""Пакетная отправка в группу каналов с обработкой исключений."""

import asyncio
import logging
from typing import Dict, List, Optional

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication
from backend.schemas.publications import ChannelPublishResult
from backend.services.publications.features.publishing.send_to_channel_with_retry import (
    send_to_channel_with_retry,
)

logger = logging.getLogger(__name__)


async def process_batch(
    publication: Publication,
    batch_channels: List[Channel],
    batch_num: int,
    get_bot_callback,
    reply_map: Optional[Dict[int, int]] = None,
) -> List[ChannelPublishResult]:
    """Параллельный gather с конвертацией исключений в FAILED-результаты."""
    logger.info("Processing batch %s: %s channels", batch_num, len(batch_channels))

    tasks = [
        safe_send_to_channel(publication, channel, get_bot_callback, reply_map)
        for channel in batch_channels
    ]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    results: List[ChannelPublishResult] = []
    for i, result in enumerate(raw_results):
        if isinstance(result, BaseException):
            channel = batch_channels[i]
            channel_name = getattr(channel, "title", str(channel.telegram_id))
            logger.error("Exception for channel %s: %s", channel_name, result)
            results.append(ChannelPublishResult(
                channel=channel_name, success=False, error=str(result),
            ))
        else:
            results.append(result)
    return results


async def safe_send_to_channel(
    publication: Publication,
    channel: Channel,
    get_bot_callback,
    reply_map: Optional[dict] = None,
) -> ChannelPublishResult:
    """Резолв бота + проверка is_bot_active + send_to_channel_with_retry."""
    channel_name = channel_display_name(channel)

    if not getattr(channel, "is_bot_active", True):
        logger.info("Bot disabled for channel %s, skipping", channel_name)
        return ChannelPublishResult(
            channel=channel_name, success=False,
            error="Bot is disabled for this channel",
        )

    try:
        bot = await get_bot_callback(channel)
    except ValueError as exc:
        return ChannelPublishResult(
            channel=channel_name, success=False, error=str(exc), permanent=True,
            notification_error=f"Failed to publish to {channel_name}: {exc}",
        )

    return await send_to_channel_with_retry(publication, channel, bot, channel_name, reply_map)


def channel_display_name(channel: Channel) -> str:
    """Лучшее доступное имя канала для логов и результатов."""
    return getattr(channel, "title", None) or getattr(channel, "name", None) or str(channel.telegram_id)
