"""
Сервис для прогрева медиа в Telegram
Отправляет файлы в служебный канал и получает file_id для быстрой рассылки
"""
import logging
from typing import Optional, List
from aiogram import Bot
from aiogram.types import Message

logger = logging.getLogger(__name__)

# ID служебного канала для прогрева медиа
STORAGE_CHANNEL_ID = -1003209009153


async def warmup_media_files(
    bot: Bot,
    media_urls: List[str],
) -> List[Optional[str]]:
    """
    Прогревает медиа файлы в Telegram
    
    Args:
        bot: Telegram бот
        media_urls: Список URL файлов для прогрева
    
    Returns:
        Список file_id для каждого URL (или None если не удалось прогреть)
    """
    file_ids = []
    
    for url in media_urls:
        try:
            file_id = await warmup_single_media(bot, url)
            file_ids.append(file_id)
            logger.info(f"Media warmed up successfully: {url} -> {file_id}")
        except Exception as e:
            logger.error(f"Failed to warmup media {url}: {e}")
            file_ids.append(None)
    
    return file_ids


async def warmup_single_media(bot: Bot, media_url: str) -> Optional[str]:
    """
    Прогревает один медиа файл в Telegram
    
    Args:
        bot: Telegram бот
        media_url: URL файла для прогрева
    
    Returns:
        file_id или None если не удалось прогреть
    """
    try:
        # Определяем тип медиа по расширению
        url_lower = media_url.lower()
        
        message: Optional[Message] = None
        
        # Видео
        if any(url_lower.endswith(ext) for ext in ['.mp4', '.mov', '.m4v', '.webm', '.avi']):
            message = await bot.send_video(
                chat_id=STORAGE_CHANNEL_ID,
                video=media_url,
            )
            if message.video:
                return message.video.file_id
        
        # Аудио
        elif any(url_lower.endswith(ext) for ext in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']):
            message = await bot.send_audio(
                chat_id=STORAGE_CHANNEL_ID,
                audio=media_url,
            )
            if message.audio:
                return message.audio.file_id
        
        # Документы
        elif any(url_lower.endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar']):
            message = await bot.send_document(
                chat_id=STORAGE_CHANNEL_ID,
                document=media_url,
            )
            if message.document:
                return message.document.file_id
        
        # Фото (по умолчанию)
        else:
            message = await bot.send_photo(
                chat_id=STORAGE_CHANNEL_ID,
                photo=media_url,
            )
            if message.photo:
                # Берем самое большое фото
                return message.photo[-1].file_id
        
        return None
    
    except Exception as e:
        logger.error(f"Error warming up media {media_url}: {e}")
        return None


def get_file_id_for_media(media_file_ids: Optional[List[str]], index: int) -> Optional[str]:
    """
    Получает file_id для медиа по индексу
    
    Args:
        media_file_ids: Список file_id
        index: Индекс медиа
    
    Returns:
        file_id или None
    """
    if not media_file_ids or index >= len(media_file_ids):
        return None
    
    return media_file_ids[index] if media_file_ids[index] else None
