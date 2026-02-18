from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import logging

from aiogram.types import InputMediaPhoto, InputMediaVideo, InputMediaDocument, InputMediaAudio
from aiogram.enums import ParseMode
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, ContentType as DBContentType, PublicationStatus as DBPublicationStatus
from backend.schemas.publications import (
    EditPublishedRequest,
    EditMessageResult,
    DeleteMessageResult,
    ChannelPublishResult
)
from backend.services.telegram_client import RateLimitedBot
from backend.services.publications.utils import clean_html_for_telegram
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


async def edit_published_message(
    publication: Publication,
    request: EditPublishedRequest,
    db: AsyncSession,
    get_bot_callback
) -> EditMessageResult:
    """Редактировать уже опубликованное сообщение во всех каналах"""
    
    if not publication.telegram_messages:
        return EditMessageResult(
            success=False,
            error="No Telegram messages found for publication",
            results=[],
            success_count=0,
            total_count=0
        )

    validation_error = validate_editability(publication)
    if validation_error:
        return EditMessageResult(
            success=False,
            error=validation_error,
            results=[],
            success_count=0,
            total_count=0
        )

    new_text = request.text_content if request.text_content is not None else publication.text_content
    requested_media = request.media_urls if request.media_urls is not None else publication.media_urls

    inline_keyboard_data: Optional[Dict[str, Any]] = None
    if request.inline_keyboard is not None:
        inline_keyboard_data = (
            request.inline_keyboard.model_dump()
            if hasattr(request.inline_keyboard, "model_dump")
            else request.inline_keyboard
        )
    else:
        inline_keyboard_data = publication.inline_keyboard

    reply_markup = build_keyboard(inline_keyboard_data) if inline_keyboard_data else None

    results = []
    for tg_msg in publication.telegram_messages:
        result = await edit_single_message(
            tg_msg,
            publication,
            request,
            new_text,
            requested_media,
            reply_markup,
            get_bot_callback
        )
        results.append(result)

    success_count = sum(1 for r in results if r.success)

    if success_count > 0:
        update_publication_after_edit(publication, request)
        await db.commit()
        await db.refresh(publication)
    else:
        await db.rollback()

    return EditMessageResult(
        success=success_count > 0,
        results=results,
        success_count=success_count,
        total_count=len(results)
    )


def validate_editability(publication: Publication) -> Optional[str]:
    """Проверить можно ли редактировать публикацию"""
    
    if publication.content_type in [DBContentType.POLL, DBContentType.QUIZ]:
        return "Editing poll or quiz messages via Telegram API is not supported"

    if (
        publication.content_type == DBContentType.TEXT_WITH_MEDIA
        and publication.media_urls
        and len(publication.media_urls) > 1
    ):
        return "Editing media albums is not supported by the Telegram Bot API"

    return None


async def edit_single_message(
    tg_msg: Any,
    publication: Publication,
    request: EditPublishedRequest,
    new_text: Optional[str],
    requested_media: Optional[List[str]],
    reply_markup: Optional[Any],
    get_bot_callback
) -> ChannelPublishResult:
    """Редактировать одно сообщение"""
    
    channel_label = getattr(
        tg_msg.channel, "title",
        getattr(tg_msg.channel, "name", str(tg_msg.channel.telegram_id))
    )

    try:
        bot = await get_bot_callback(tg_msg.channel)

        if publication.content_type in [DBContentType.TEXT, DBContentType.LINK]:
            await edit_text_message(
                bot,
                tg_msg.channel.telegram_id,
                tg_msg.telegram_message_id,
                new_text,
                reply_markup
            )

        elif publication.content_type in [
            DBContentType.IMAGE,
            DBContentType.VIDEO,
            DBContentType.AUDIO,
            DBContentType.DOCUMENT,
            DBContentType.TEXT_WITH_MEDIA
        ]:
            await edit_media_message(
                bot,
                tg_msg.channel.telegram_id,
                tg_msg.telegram_message_id,
                publication,
                request,
                new_text,
                requested_media,
                reply_markup
            )

        return ChannelPublishResult(channel=channel_label, success=True)

    except Exception as e:
        return ChannelPublishResult(
            channel=channel_label,
            success=False,
            error=str(e)
        )


async def edit_text_message(
    bot: RateLimitedBot,
    chat_id: int,
    message_id: int,
    text: Optional[str],
    reply_markup: Optional[Any]
) -> None:
    """Редактировать текстовое сообщение"""
    
    if text is None:
        raise ValueError("text_content must be provided for text publications")

    cleaned_text = clean_html_for_telegram(text)
    if not cleaned_text:
        raise ValueError("Telegram message text is empty")
        
    await bot.edit_message_text(
        chat_id=chat_id,
        message_id=message_id,
        text=cleaned_text,
        parse_mode=ParseMode.HTML,
        reply_markup=reply_markup
    )


async def edit_media_message(
    bot: RateLimitedBot,
    chat_id: int,
    message_id: int,
    publication: Publication,
    request: EditPublishedRequest,
    new_text: Optional[str],
    requested_media: Optional[List[str]],
    reply_markup: Optional[Any]
) -> None:
    """Редактировать медиа сообщение"""
    
    if request.media_urls is not None and not request.media_urls:
        raise ValueError("media_urls cannot be empty when provided")

    media_url = None
    if requested_media:
        if len(requested_media) > 1:
            raise ValueError("Only one media item can be edited at a time")
        media_url = requested_media[0]

    caption_value = new_text if new_text is not None else publication.text_content
    cleaned_caption = clean_html_for_telegram(caption_value) if caption_value is not None else ""

    can_use_caption_edit = (
        media_url is None or
        (publication.media_urls and media_url == publication.media_urls[0])
    )

    if request.media_urls is None and can_use_caption_edit:
        await bot.edit_message_caption(
            chat_id=chat_id,
            message_id=message_id,
            caption=cleaned_caption,
            parse_mode=ParseMode.HTML,
            reply_markup=reply_markup
        )
    else:
        if media_url is None:
            if not publication.media_urls:
                raise ValueError("Original media is missing and no replacement provided")
            media_url = publication.media_urls[0]

        media_input = create_media_input(
            publication.content_type,
            media_url,
            cleaned_caption,
            publication.media_blur
        )

        await bot.edit_message_media(
            chat_id=chat_id,
            message_id=message_id,
            media=media_input,
            reply_markup=reply_markup
        )


def create_media_input(
    content_type: DBContentType,
    media_url: str,
    caption: Optional[str],
    spoiler: bool
):
    """Создать InputMedia объект для редактирования"""
    
    if content_type in [DBContentType.IMAGE, DBContentType.TEXT_WITH_MEDIA]:
        return InputMediaPhoto(
            media=media_url,
            caption=caption or "",
            parse_mode=ParseMode.HTML,
            has_spoiler=spoiler
        )
    elif content_type == DBContentType.VIDEO:
        return InputMediaVideo(
            media=media_url,
            caption=caption or "",
            parse_mode=ParseMode.HTML,
            has_spoiler=spoiler
        )
    elif content_type == DBContentType.AUDIO:
        return InputMediaAudio(
            media=media_url,
            caption=caption or "",
            parse_mode=ParseMode.HTML
        )
    elif content_type == DBContentType.DOCUMENT:
        return InputMediaDocument(
            media=media_url,
            caption=caption or "",
            parse_mode=ParseMode.HTML
        )
    else:
        raise ValueError(f"Unsupported media type for editing: {content_type}")


def update_publication_after_edit(publication: Publication, request: EditPublishedRequest) -> None:
    """Обновить модель публикации после успешного редактирования"""
    
    if request.text_content is not None:
        publication.text_content = request.text_content

    if request.inline_keyboard is not None:
        publication.inline_keyboard = (
            request.inline_keyboard.model_dump()
            if request.inline_keyboard
            else None
        )

    if request.media_urls is not None:
        publication.media_urls = request.media_urls

    publication.updated_at = datetime.now(timezone.utc)


async def delete_telegram_messages(
    publication: Publication,
    db: AsyncSession,
    get_bot_callback
) -> DeleteMessageResult:
    """Удалить опубликованные сообщения из всех Telegram каналов"""
    
    results = []

    for tg_msg in publication.telegram_messages:
        channel_label = getattr(
            tg_msg.channel, "title",
            getattr(tg_msg.channel, "name", str(tg_msg.channel.telegram_id))
        )

        try:
            bot = await get_bot_callback(tg_msg.channel)
            await bot.delete_message(
                chat_id=tg_msg.channel.telegram_id,
                message_id=tg_msg.telegram_message_id
            )
            results.append(ChannelPublishResult(channel=channel_label, success=True))

        except Exception as e:
            results.append(ChannelPublishResult(
                channel=channel_label,
                success=False,
                error=str(e)
            ))

    success_count = sum(1 for r in results if r.success)

    if success_count == len(results):
        publication.status = DBPublicationStatus.DELETED

    await db.commit()

    return DeleteMessageResult(
        success=success_count > 0,
        results=results,
        success_count=success_count,
        total_count=len(results)
    )
