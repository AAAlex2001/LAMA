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
from backend.services.publications.utils import (
    clean_html_for_telegram,
    get_spoiler,
    is_audio_url,
    is_document_url,
    is_video_url,
    prepare_inline_keyboard_data,
    validate_media_urls,
)

logger = logging.getLogger(__name__)


async def send_to_telegram(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    reply_to_message_id: Optional[int] = None
) -> List[Message]:
    """Отправить публикацию в Telegram канал"""
    
    validate_media_urls(publication)
    
    keyboard = None
    if publication.inline_keyboard:
        prepared_keyboard = prepare_inline_keyboard_data(publication)
        keyboard = build_keyboard(prepared_keyboard) if prepared_keyboard else None
    
    content_type = publication.content_type
    cleaned_text = clean_html_for_telegram(publication.text_content)
    messages: List[Message] = []

    if content_type == DBContentType.TEXT:
        if cleaned_text:
            messages = await send_text(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)
        else:
            # Если текст пустой, но есть опрос — просто пропускаем текстовое сообщение
            if not publication.poll_data:
                raise ValueError('Telegram message text is empty')

    elif content_type == DBContentType.TEXT_WITH_MEDIA:
        messages = await send_text_with_media(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.IMAGE:
        messages = await send_image(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.VIDEO:
        messages = await send_video(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.AUDIO:
        messages = await send_audio(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.DOCUMENT:
        messages = await send_document(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)

    elif content_type == DBContentType.LINK:
        if cleaned_text:
            messages = await send_link(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)
        else:
            if not publication.poll_data:
                raise ValueError('Telegram message text is empty')

    elif content_type in [DBContentType.POLL, DBContentType.QUIZ]:
        messages = await send_poll(bot, channel, publication, keyboard, reply_to_message_id)

    else:
        raise ValueError(f"Unsupported content type: {content_type}")

    # Если к обычному посту прикрепили опрос/викторину — отправляем опрос вторым сообщением
    if publication.poll_data and content_type not in [DBContentType.POLL, DBContentType.QUIZ]:
        poll_messages = await send_poll(bot, channel, publication, keyboard=None)
        messages.extend(poll_messages)

    return messages


async def send_text(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить текстовое сообщение"""
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content),
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification,
        disable_web_page_preview=publication.disable_web_page_preview,
        reply_to_message_id=reply_to_message_id
    )
    return [message]


async def send_text_with_media(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить текст с медиа"""
    if not publication.media_urls:
        return await send_text(bot, channel, publication, keyboard, reply_to_message_id, cleaned_text)
    
    blur_list = publication.media_blur or []
    caption_text = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    
    if len(publication.media_urls) == 1:
        single_url = publication.media_urls[0]
        file_id = get_file_id_for_media(publication.media_file_ids, 0)
        media_to_send = file_id if file_id else single_url
        
        spoiler = get_spoiler(blur_list, 0)
        is_video = is_video_url(single_url)
        is_document = is_document_url(single_url)
        
        logger.info(
            f"Single media: url={single_url[:80]}, "
            f"file_id={'Yes' if file_id else 'No'}, is_video={is_video}, is_document={is_document}"
        )
        
        if is_document:
            message = await bot.send_document(
                chat_id=channel.telegram_id,
                document=media_to_send,
                caption=caption_text,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                disable_notification=publication.disable_notification,
                reply_to_message_id=reply_to_message_id
            )
        elif is_video:
            message = await bot.send_video(
                chat_id=channel.telegram_id,
                video=media_to_send,
                caption=caption_text,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=spoiler,
                disable_notification=publication.disable_notification,
                reply_to_message_id=reply_to_message_id
            )
        else:
            message = await bot.send_photo(
                chat_id=channel.telegram_id,
                photo=media_to_send,
                caption=caption_text,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=spoiler,
                disable_notification=publication.disable_notification,
                reply_to_message_id=reply_to_message_id
            )
        return [message]
    
    urls = publication.media_urls[:10]
    logger.info(f"Preparing media_group: {len(urls)} files, file_ids={publication.media_file_ids}")

    cleaned_caption = caption_text
    media: list = []

    for i, url in enumerate(urls):
        file_id = get_file_id_for_media(publication.media_file_ids, i)
        media_to_send = file_id if file_id else url
        file_spoiler = get_spoiler(blur_list, i)

        logger.info(f"Media {i+1}/{len(urls)}: using {'file_id' if file_id else 'URL'} = {str(media_to_send)[:50]}...")

        is_first = i == 0
        add_caption = is_first and bool(cleaned_caption)

        if is_document_url(url):
            if add_caption:
                media.append(InputMediaDocument(media=media_to_send, caption=cleaned_caption, parse_mode=ParseMode.HTML))
            else:
                media.append(InputMediaDocument(media=media_to_send))
        elif is_audio_url(url):
            if add_caption:
                media.append(InputMediaAudio(media=media_to_send, caption=cleaned_caption, parse_mode=ParseMode.HTML))
            else:
                media.append(InputMediaAudio(media=media_to_send))
        elif is_video_url(url):
            if add_caption:
                media.append(
                    InputMediaVideo(
                        media=media_to_send,
                        caption=cleaned_caption,
                        parse_mode=ParseMode.HTML,
                        has_spoiler=file_spoiler,
                    )
                )
            else:
                media.append(InputMediaVideo(media=media_to_send, has_spoiler=file_spoiler))
        else:
            if add_caption:
                media.append(
                    InputMediaPhoto(
                        media=media_to_send,
                        caption=cleaned_caption,
                        parse_mode=ParseMode.HTML,
                        has_spoiler=file_spoiler,
                    )
                )
            else:
                media.append(InputMediaPhoto(media=media_to_send, has_spoiler=file_spoiler))

    messages = await bot.send_media_group(
        chat_id=channel.telegram_id,
        media=media,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id
    )
    return list(messages)


async def send_image(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить фото"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    url = publication.media_urls[0]
    
    cleaned_caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id,
            document=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id
        )
    else:
        message = await bot.send_photo(
            chat_id=channel.telegram_id,
            photo=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            has_spoiler=publication.media_blur,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id
        )
    return [message]


async def send_video(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить видео"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    url = publication.media_urls[0]
    cleaned_caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    
    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id,
            document=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id
        )
    else:
        message = await bot.send_video(
            chat_id=channel.telegram_id,
            video=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            has_spoiler=publication.media_blur,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id
        )
    return [message]


async def send_audio(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить аудио"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    url = publication.media_urls[0]
    cleaned_caption = cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content)
    
    if file_id and is_document_url(url):
        message = await bot.send_document(
            chat_id=channel.telegram_id,
            document=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id
        )
    else:
        message = await bot.send_audio(
            chat_id=channel.telegram_id,
            audio=media_to_send,
            caption=cleaned_caption,
            reply_markup=keyboard,
            parse_mode=ParseMode.HTML,
            disable_notification=publication.disable_notification,
            reply_to_message_id=reply_to_message_id
        )
    return [message]


async def send_document(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить документ"""
    file_id = get_file_id_for_media(publication.media_file_ids, 0)
    media_to_send = file_id if file_id else publication.media_urls[0]
    
    message = await bot.send_document(
        chat_id=channel.telegram_id,
        document=media_to_send,
        caption=cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content),
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id
    )
    return [message]


async def send_link(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None,
    cleaned_text: Optional[str] = None,
) -> List[Message]:
    """Отправить ссылку с превью"""
    message = await bot.send_message(
        chat_id=channel.telegram_id,
        text=cleaned_text if cleaned_text is not None else clean_html_for_telegram(publication.text_content),
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
        disable_web_page_preview=publication.disable_web_page_preview,
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id
    )
    return [message]


async def send_poll(
    bot: RateLimitedBot,
    channel: Channel,
    publication: Publication,
    keyboard: Optional[InlineKeyboardMarkup],
    reply_to_message_id: Optional[int] = None
) -> List[Message]:
    """Отправить опрос или викторину"""
    poll_data = publication.poll_data
    is_quiz = bool(poll_data.get('is_quiz')) or publication.content_type == DBContentType.QUIZ
    
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
        disable_notification=publication.disable_notification,
        reply_to_message_id=reply_to_message_id
    )
    return [message]
