"""Прогрев медиа в Telegram для быстрой рассылки по file_id."""

import io
import logging
from typing import List, Optional, Tuple
from urllib.parse import urlparse

import httpx
from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import BufferedInputFile, Message
from PIL import Image

from backend.services.rate_limiter import get_rate_limiter

logger = logging.getLogger(__name__)

STORAGE_CHANNEL_ID = 874275963
MAX_IMAGE_DIMENSION = 8000
MAX_IMAGE_PIXELS = 10_000_000


async def warmup_media_files(bot: Bot, media_urls: List[str]) -> List[Optional[str]]:
    """
    Прогревает медиа файлы в Telegram параллельно.
    
    Args:
        bot: Telegram бот
        media_urls: Список URL файлов
    
    Returns:
        Список file_id (None если прогрев не удался)
    """
    import asyncio
    
    async def warmup_with_logging(idx: int, url: str, total: int) -> Optional[str]:
        try:
            file_id = await warmup_single_media(bot, url)
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


async def warmup_single_media(bot: Bot, media_url: str) -> Optional[str]:
    """
    Прогревает один медиа файл.
    
    Args:
        bot: Telegram бот
        media_url: URL файла
    
    Returns:
        file_id или None
    """
    url_lower = media_url.lower()

    try:
        file_bytes, filename = await download_media(media_url)
        
        is_photo = not any(url_lower.endswith(ext) for ext in 
                          ['.mp4', '.mov', '.m4v', '.webm', '.avi',
                           '.mp3', '.wav', '.ogg', '.m4a', '.flac',
                           '.pdf', '.doc', '.docx', '.txt', '.zip', '.rar'])
        
        if is_photo:
            file_bytes = resize_image_if_needed(file_bytes, filename)
        
        input_file = BufferedInputFile(file_bytes, filename=filename)
        message: Optional[Message] = None

        if any(url_lower.endswith(ext) for ext in ['.mp4', '.mov', '.m4v', '.webm', '.avi']):
            rate_limiter = get_rate_limiter()
            async with rate_limiter.limit(chat_id=STORAGE_CHANNEL_ID):
                message = await bot.send_video(chat_id=STORAGE_CHANNEL_ID, video=input_file)
            if message.video:
                return message.video.file_id

        elif any(url_lower.endswith(ext) for ext in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']):
            rate_limiter = get_rate_limiter()
            async with rate_limiter.limit(chat_id=STORAGE_CHANNEL_ID):
                message = await bot.send_audio(chat_id=STORAGE_CHANNEL_ID, audio=input_file)
            if message.audio:
                return message.audio.file_id

        elif any(url_lower.endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar']):
            rate_limiter = get_rate_limiter()
            async with rate_limiter.limit(chat_id=STORAGE_CHANNEL_ID):
                message = await bot.send_document(chat_id=STORAGE_CHANNEL_ID, document=input_file)
            if message.document:
                return message.document.file_id

        else:
            rate_limiter = get_rate_limiter()
            async with rate_limiter.limit(chat_id=STORAGE_CHANNEL_ID):
                message = await bot.send_photo(chat_id=STORAGE_CHANNEL_ID, photo=input_file)
            if message.photo:
                return message.photo[-1].file_id

        logger.warning("Warmup: unexpected message payload for %s", media_url)
        return None

    except Exception:
        logger.exception("Error warming up media: %s", media_url)
        return None


async def download_media(url: str) -> Tuple[bytes, str]:
    """Скачивает файл по URL."""
    parsed = urlparse(url)
    filename = parsed.path.split("/")[-1] or "media"

    timeout = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        try:
            resp = await client.get(url)
        except Exception:
            logger.exception("Download failed: %s", url)
            raise

    if resp.status_code >= 400:
        logger.error("Download bad status %s: %s", resp.status_code, url)
        raise RuntimeError(f"Download failed with status {resp.status_code}")

    logger.info("Downloaded: %s (%s bytes, %s)", url, len(resp.content), resp.headers.get("content-type"))
    return resp.content, filename


def resize_image_if_needed(file_bytes: bytes, filename: str) -> bytes:
    """Сжимает изображение если оно превышает лимиты Telegram."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        total_pixels = width * height
        
        logger.info("Checking image %s: %sx%s (%s px)", filename, width, height, total_pixels)
        
        needs_resize = (
            width > MAX_IMAGE_DIMENSION or 
            height > MAX_IMAGE_DIMENSION or
            total_pixels > MAX_IMAGE_PIXELS
        )
        
        if not needs_resize:
            logger.info("Image %s within limits", filename)
            return file_bytes
        
        scale_by_dimension = 1.0
        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            scale_by_dimension = MAX_IMAGE_DIMENSION / max(width, height)
        
        scale_by_pixels = 1.0
        if total_pixels > MAX_IMAGE_PIXELS:
            scale_by_pixels = (MAX_IMAGE_PIXELS / total_pixels) ** 0.5
        
        scale = min(scale_by_dimension, scale_by_pixels)
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        logger.info("Resizing %s: %sx%s -> %sx%s", filename, width, height, new_width, new_height)
        
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img_format = img.format or 'JPEG'
        
        if img_format == 'JPEG':
            img_resized.save(output, format='JPEG', quality=90, optimize=True)
        elif img_format == 'PNG':
            img_resized.save(output, format='PNG', optimize=True)
        else:
            if img_resized.mode in ('RGBA', 'LA', 'P'):
                img_resized = img_resized.convert('RGB')
            img_resized.save(output, format='JPEG', quality=90, optimize=True)
        
        resized_bytes = output.getvalue()
        logger.info("Resized %s: %s -> %s bytes", filename, len(file_bytes), len(resized_bytes))
        return resized_bytes
        
    except Exception:
        logger.exception("Resize failed for %s, using original", filename)
        return file_bytes


def get_file_id_for_media(media_file_ids: Optional[List[Optional[str]]], index: int) -> Optional[str]:
    """
    Возвращает file_id по индексу.
    
    Args:
        media_file_ids: Список file_id
        index: Индекс
    
    Returns:
        file_id или None
    """
    if not media_file_ids or index >= len(media_file_ids):
        return None
    
    value = media_file_ids[index]
    return value if value else None
