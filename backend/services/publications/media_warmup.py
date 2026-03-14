"""Прогрев медиа в Telegram для быстрой рассылки по file_id."""

import asyncio
import logging
from typing import List, Optional

from aiogram import Bot
from backend.config import TELEGRAM_BOT_TOKEN
from backend.services.telegram_client import RateLimitedBot
from aiogram.types import BufferedInputFile, Message

from backend.services.rate_limiter import get_rate_limiter
from backend.services.publications.media_download import download_media, resize_image_if_needed
from backend.services.publications.utils import (
    AUDIO_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    VIDEO_EXTENSIONS,
    is_audio_url,
    is_document_url,
    is_video_url,
)

logger = logging.getLogger(__name__)

STORAGE_CHANNEL_IDS = [874275963, 850249529]


async def warmup_media_files(bot: RateLimitedBot, media_urls: List[str]) -> List[Optional[str]]:
    """Прогревает медиа файлы в Telegram параллельно."""
    async def warmup_with_logging(idx: int, url: str, total: int) -> Optional[str]:
        try:
            file_id = await warmup_single_media(bot, url, idx=idx)
            if file_id:
                logger.info("Warmup ok (%s/%s): %s -> %s", idx, total, url, file_id)
            else:
                logger.warning("Warmup null file_id (%s/%s): %s", idx, total, url)
            return file_id
        except Exception:
            logger.exception("Warmup failed (%s/%s): %s", idx, total, url)
            return None

    tasks = [
        warmup_with_logging(idx, url, len(media_urls))
        for idx, url in enumerate(media_urls, start=1)
    ]

    file_ids = await asyncio.gather(*tasks, return_exceptions=False)
    return list(file_ids)


async def warmup_single_media(bot: RateLimitedBot, media_url: str, idx: Optional[int] = None) -> Optional[str]:
    """Прогревает один медиа файл."""
    if not STORAGE_CHANNEL_IDS:
        raise RuntimeError("No STORAGE_CHANNEL_IDS configured")

    if isinstance(idx, int) and idx > 0:
        storage_channel_id = STORAGE_CHANNEL_IDS[(idx - 1) % len(STORAGE_CHANNEL_IDS)]
    else:
        storage_channel_id = STORAGE_CHANNEL_IDS[0]

    url_lower = media_url.lower()

    try:
        file_bytes, filename = await download_media(media_url)

        is_media_file = is_video_url(url_lower) or is_audio_url(url_lower) or is_document_url(url_lower)
        is_photo = not is_media_file

        logger.info(f"Warmup file: {filename}, is_photo={is_photo}, url={url_lower[:80]}")

        if is_photo:
            file_bytes = resize_image_if_needed(file_bytes, filename)

        input_file = BufferedInputFile(file_bytes, filename=filename)
        message: Optional[Message] = None
        rate_limiter = get_rate_limiter()

        if url_lower.endswith(VIDEO_EXTENSIONS):
            async with rate_limiter.limit(chat_id=storage_channel_id):
                message = await bot.send_video(chat_id=storage_channel_id, video=input_file)
            if message.video:
                return message.video.file_id

        elif url_lower.endswith(AUDIO_EXTENSIONS):
            async with rate_limiter.limit(chat_id=storage_channel_id):
                message = await bot.send_audio(chat_id=storage_channel_id, audio=input_file)
            if message.audio:
                return message.audio.file_id

        elif url_lower.endswith(DOCUMENT_EXTENSIONS):
            async with rate_limiter.limit(chat_id=storage_channel_id):
                message = await bot.send_document(chat_id=storage_channel_id, document=input_file)
            if message.document:
                return message.document.file_id

        else:
            async with rate_limiter.limit(chat_id=storage_channel_id):
                message = await bot.send_photo(chat_id=storage_channel_id, photo=input_file)
            if message.photo:
                return message.photo[-1].file_id

        logger.warning("Warmup: unexpected message payload for %s", media_url)
        return None

    except Exception:
        logger.exception("Error warming up media: %s", media_url)
        return None


def get_file_id_for_media(
    media_file_ids: Optional[List[Optional[str]]], index: int, bot_token: Optional[str] = None,
) -> Optional[str]:
    """Возвращает file_id по индексу. Если bot_token передан и не совпадает с master — None."""
    if bot_token and bot_token != TELEGRAM_BOT_TOKEN:
        return None
    if not media_file_ids or index >= len(media_file_ids):
        return None
    value = media_file_ids[index]
    return value if value else None


def resolve_media(file_id: Optional[str], url: str):
    """file_id или URL. Для видео/документов/аудио без file_id — URLInputFile."""
    if file_id:
        return file_id
    if is_video_url(url) or is_document_url(url) or is_audio_url(url):
        from aiogram.types import URLInputFile
        filename = url.rsplit("/", 1)[-1].split("?")[0]
        return URLInputFile(url, filename=filename)
    return url
