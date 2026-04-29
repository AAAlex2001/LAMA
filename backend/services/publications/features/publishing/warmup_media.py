"""Прогрев медиа в Telegram (получение file_id для быстрой рассылки)."""

import asyncio
import logging
from typing import List, Optional

from aiogram.types import BufferedInputFile, Message

from backend.config import TELEGRAM_BOT_TOKEN
from backend.services.publications.features.publishing.download_media import (
    download_media,
    resize_image_if_needed,
)
from backend.services.publications.utils import (
    AUDIO_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    VIDEO_EXTENSIONS,
    is_audio_url,
    is_document_url,
    is_video_url,
)
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)

STORAGE_CHANNEL_IDS = [874275963, 850249529]


async def warmup_media_files(
    bot: RateLimitedBot, media_urls: List[str],
) -> List[Optional[str]]:
    """Параллельный warmup всех URL-ов; результат — file_id или None."""
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
    return list(await asyncio.gather(*tasks, return_exceptions=False))


async def warmup_single_media(
    bot: RateLimitedBot, media_url: str, idx: Optional[int] = None,
) -> Optional[str]:
    """Прогревает один файл: скачивает, отправляет в storage, возвращает file_id."""
    if not STORAGE_CHANNEL_IDS:
        raise RuntimeError("No STORAGE_CHANNEL_IDS configured")

    storage_chat_id = pick_storage_chat(idx)
    url_lower = media_url.lower()

    try:
        file_bytes, filename = await download_media(media_url)
        is_media_file = is_video_url(url_lower) or is_audio_url(url_lower) or is_document_url(url_lower)

        if not is_media_file:
            file_bytes = resize_image_if_needed(file_bytes, filename)

        input_file = BufferedInputFile(file_bytes, filename=filename)
        message = await send_to_storage(bot, storage_chat_id, url_lower, input_file)
        return extract_file_id(message, url_lower)

    except Exception:
        logger.exception("Error warming up media: %s", media_url)
        return None


def pick_storage_chat(idx: Optional[int]) -> int:
    """Раскладка по STORAGE_CHANNEL_IDS, чтобы распределить нагрузку."""
    if isinstance(idx, int) and idx > 0:
        return STORAGE_CHANNEL_IDS[(idx - 1) % len(STORAGE_CHANNEL_IDS)]
    return STORAGE_CHANNEL_IDS[0]


async def send_to_storage(
    bot: RateLimitedBot, storage_chat_id: int, url_lower: str, input_file: BufferedInputFile,
) -> Optional[Message]:
    """Отправляет файл в storage-чат соответствующим типом."""
    if url_lower.endswith(VIDEO_EXTENSIONS):
        return await bot.send_video(chat_id=storage_chat_id, video=input_file)
    if url_lower.endswith(AUDIO_EXTENSIONS):
        return await bot.send_audio(chat_id=storage_chat_id, audio=input_file)
    if url_lower.endswith(DOCUMENT_EXTENSIONS):
        return await bot.send_document(chat_id=storage_chat_id, document=input_file)
    return await bot.send_photo(chat_id=storage_chat_id, photo=input_file)


def extract_file_id(message: Optional[Message], url_lower: str) -> Optional[str]:
    """Достаёт file_id из ответа TG; для фото берёт самый крупный размер."""
    if not message:
        return None
    if url_lower.endswith(VIDEO_EXTENSIONS) and message.video:
        return message.video.file_id
    if url_lower.endswith(AUDIO_EXTENSIONS) and message.audio:
        return message.audio.file_id
    if url_lower.endswith(DOCUMENT_EXTENSIONS) and message.document:
        return message.document.file_id
    if message.photo:
        return message.photo[-1].file_id
    return None


def get_file_id_for_media(
    media_file_ids: Optional[List[Optional[str]]],
    index: int,
    bot_token: Optional[str] = None,
) -> Optional[str]:
    """file_id по индексу; None если bot_token чужой (file_id не совместимы)."""
    if bot_token and bot_token != TELEGRAM_BOT_TOKEN:
        return None
    if not media_file_ids or index >= len(media_file_ids):
        return None
    value = media_file_ids[index]
    return value if value else None


def resolve_media(file_id: Optional[str], url: str):
    """Возвращает file_id; иначе URL (для медиа-файлов — URLInputFile)."""
    if file_id:
        return file_id
    if is_video_url(url) or is_document_url(url) or is_audio_url(url):
        from aiogram.types import URLInputFile
        filename = url.rsplit("/", 1)[-1].split("?")[0]
        return URLInputFile(url, filename=filename)
    return url
