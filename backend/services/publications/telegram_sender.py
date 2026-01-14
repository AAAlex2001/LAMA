from typing import List, Optional
import logging

from aiogram.types import (
    Message, InputMediaPhoto, InputMediaVideo, 
    InputMediaDocument, InputMediaAudio, InlineKeyboardMarkup
)
from aiogram.enums import ParseMode

from backend.models.publications import Publication, ContentType as DBContentType
from backend.models.channels import ChannelGroup as Channel
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard
from backend.services.publications.media_warmup import get_file_id_for_media

logger = logging.getLogger(__name__)


async def send_to_telegram(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot
) -> List[Message]:
    """Отправить публикацию в Telegram канал"""
    
    validate_media_urls(publication)
    
    keyboard = None
    if publication.inline_keyboard:
        keyboard = build_keyboard(publication.inline_keyboard)
    
    content_type = publication.content_type
    
    if content_type == DBContentType.TEXT:
        return await send_text(bot, channel, publication, keyboard)
    
    if content_type == DBContentType.TEXT_WITH_MEDIA:
        return await send_text_with_media(bot, channel, publication, keyboard)
    
    if content_type == DBContentType.IMAGE:
        return await send_image(bot, channel, publication, keyboard)
    
    if content_type == DBContentType.VIDEO:
        return await send_video(bot, channel, publication, keyboard)
    
    if content_type == DBContentType.AUDIO:
        return await send_audio(bot, channel, publication, keyboard)
    
    if content_type == DBContentType.DOCUMENT:
        return await send_document(bot, channel, publication, keyboard)
    
    if content_type == DBContentType.LINK:
        return await send_link(bot, channel, publication, keyboard)
    
    if content_type in [DBContentType.POLL, DBContentType.QUIZ]:
        return await send_poll(bot, channel, publication, keyboard)
    
    raise ValueError(f"Unsupported content type: {content_type}")


def validate_media_urls(publication: Publication) -> None:
    """Валидация наличия медиа URL для типов контента требующих медиа"""
    content_type = publication.content_type
    
    if content_type in [DBContentType.IMAGE, DBContentType.VIDEO, 
                       DBContentType.AUDIO, DBContentType.DOCUMENT]:
        if not publication.media_urls or not publication.media_urls[0]:
            type_name = content_type.value.upper()
            raise ValueError(f"media_urls is required for {type_name} content type")


async def send_text(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить текстовое сообщение"""
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=publication.text_content,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification
    )
    return [message]


async def send_text_with_media(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить текст с медиа"""
    if not publication.media_urls or len(publication.media_urls) == 0:
        return await send_text(bot, channel, publication, keyboard)
    
    blur_list = publication.media_blur or []
    
    if len(publication.media_urls) == 1:
        single_url = publication.media_urls[0]
        file_id = get_file_id_for_media(publication.media_file_ids, 0)
        media_to_send = file_id if file_id else single_url
        
        spoiler = get_spoiler(blur_list, 0)
        is_video = is_video_url(single_url)
        
        if is_video:
            message = await bot.send_video(
                chat_id=channel.telegram_id,
                video=media_to_send,
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=spoiler,
                disable_notification=publication.disable_notification
            )
        else:
            message = await bot.send_photo(
                chat_id=channel.telegram_id,
                photo=media_to_send,
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=spoiler,
                disable_notification=publication.disable_notification
            )
        return [message]
    
    media = []
    urls = publication.media_urls[:10]
    
    for i, url in enumerate(urls):
        file_id = get_file_id_for_media(publication.media_file_ids, i)
        media_to_send = file_id if file_id else url
        file_spoiler = get_spoiler(blur_list, i)
        
        if i == 0 and publication.text_content:
            if is_video_url(url):
                media.append(InputMediaVideo(
                    media=media_to_send,
                    caption=publication.text_content,
                    parse_mode=ParseMode.HTML,
                    has_spoiler=file_spoiler
                ))
            else:
                media.append(InputMediaPhoto(
                    media=media_to_send,
                    caption=publication.text_content,
                    parse_mode=ParseMode.HTML,
                    has_spoiler=file_spoiler
                ))
        else:
            if is_video_url(url):
                media.append(InputMediaVideo(media=media_to_send, has_spoiler=file_spoiler))
            else:
                media.append(InputMediaPhoto(media=media_to_send, has_spoiler=file_spoiler))
    
    messages = await bot.send_media_group(
        chat_id=channel.telegram_id,
        media=media,
        disable_notification=publication.disable_notification
    )
    return list(messages)


async def send_image(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить фото"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    
    message = await bot.send_photo(
        chat_id=channel.telegram_id,
        photo=media_to_send,
        caption=publication.text_content,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        has_spoiler=publication.media_blur,
        disable_notification=publication.disable_notification
    )
    return [message]


async def send_video(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить видео"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    
    message = await bot.send_video(
        chat_id=channel.telegram_id,
        video=media_to_send,
        caption=publication.text_content,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        has_spoiler=publication.media_blur,
        disable_notification=publication.disable_notification
    )
    return [message]


async def send_audio(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить аудио"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    
    message = await bot.send_audio(
        chat_id=channel.telegram_id,
        audio=media_to_send,
        caption=publication.text_content,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification
    )
    return [message]


async def send_document(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить документ"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    
    message = await bot.send_document(
        chat_id=channel.telegram_id,
        document=media_to_send,
        caption=publication.text_content,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification
    )
    return [message]


async def send_link(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить ссылку с превью"""
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=publication.text_content,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_web_page_preview=False,
        disable_notification=publication.disable_notification
    )
    return [message]


async def send_poll(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup]
) -> List[Message]:
    """Отправить опрос или викторину"""
    poll_data = publication.poll_data
    is_quiz = publication.content_type == DBContentType.QUIZ
    
    message = await bot.send_poll(
        chat_id=channel.telegram_id,
        question=poll_data['question'],
        options=poll_data['options'],
        is_anonymous=poll_data.get('is_anonymous', True),
        type='quiz' if is_quiz else 'regular',
        allows_multiple_answers=poll_data.get('allows_multiple_answers', False),
        correct_option_id=poll_data.get('correct_option_id'),
        explanation=poll_data.get('explanation'),
        reply_markup=keyboard,
        disable_notification=publication.disable_notification
    )
    return [message]


def get_spoiler(blur_list: Optional[List[bool]], index: int) -> bool:
    """Получить значение spoiler для медиа по индексу"""
    if blur_list and index < len(blur_list):
        return bool(blur_list[index])
    return False


def is_video_url(url: str) -> bool:
    """Проверить является ли URL видео"""
    return url.lower().endswith((".mp4", ".mov", ".m4v", ".webm"))
