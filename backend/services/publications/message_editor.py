"""Редактирование и удаление опубликованных сообщений."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, ContentType as DBContentType, PublicationStatus as DBPublicationStatus
from backend.schemas.publications import (
    EditPublishedRequest,
    EditMessageResult,
    DeleteMessageResult,
    ChannelPublishResult,
)
from backend.utils.keyboard import build_keyboard
from backend.services.publications.edit_telegram import edit_single_message

logger = logging.getLogger(__name__)


async def edit_published_message(
    publication: Publication,
    request: EditPublishedRequest,
    db: AsyncSession,
    get_bot_callback,
) -> EditMessageResult:
    """Редактировать уже опубликованное сообщение во всех каналах."""
    if not publication.telegram_messages:
        return EditMessageResult(
            success=False, error="No Telegram messages found for publication",
            results=[], success_count=0, total_count=0,
        )

    validation_error = validate_editability(publication)
    if validation_error:
        return EditMessageResult(
            success=False, error=validation_error, results=[], success_count=0, total_count=0,
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
            tg_msg, publication, request, new_text, requested_media, reply_markup, get_bot_callback,
        )
        results.append(result)

    success_count = sum(1 for r in results if r.success)

    if success_count > 0:
        update_publication_after_edit(publication, request)
        await db.flush()
        await db.refresh(publication)
    else:
        await db.rollback()

    return EditMessageResult(success=success_count > 0, results=results, success_count=success_count, total_count=len(results))


def validate_editability(publication: Publication) -> Optional[str]:
    """Проверить можно ли редактировать публикацию."""
    if publication.content_type in [DBContentType.POLL, DBContentType.QUIZ]:
        return "Editing poll or quiz messages via Telegram API is not supported"
    if (
        publication.content_type == DBContentType.TEXT_WITH_MEDIA
        and publication.media_urls
        and len(publication.media_urls) > 1
    ):
        return "Editing media albums is not supported by the Telegram Bot API"
    return None


def update_publication_after_edit(publication: Publication, request: EditPublishedRequest) -> None:
    """Обновить модель публикации после успешного редактирования."""
    if request.text_content is not None:
        publication.text_content = request.text_content
    if request.inline_keyboard is not None:
        publication.inline_keyboard = (
            request.inline_keyboard.model_dump() if request.inline_keyboard else None
        )
    if request.media_urls is not None:
        publication.media_urls = request.media_urls
    publication.updated_at = datetime.now(timezone.utc)


async def delete_telegram_messages(
    publication: Publication,
    db: AsyncSession,
    get_bot_callback,
) -> DeleteMessageResult:
    """Удалить опубликованные сообщения из всех Telegram каналов."""
    results = []

    for tg_msg in publication.telegram_messages:
        channel_label = getattr(
            tg_msg.channel, "title",
            getattr(tg_msg.channel, "name", str(tg_msg.channel.telegram_id)),
        )
        try:
            bot = await get_bot_callback(tg_msg.channel)
            await bot.delete_message(chat_id=tg_msg.channel.telegram_id, message_id=tg_msg.telegram_message_id)
            results.append(ChannelPublishResult(channel=channel_label, success=True))
        except Exception as e:
            results.append(ChannelPublishResult(channel=channel_label, success=False, error=str(e)))

    success_count = sum(1 for r in results if r.success)
    if success_count == len(results):
        publication.status = DBPublicationStatus.DELETED

    await db.flush()

    return DeleteMessageResult(
        success=success_count > 0, results=results, success_count=success_count, total_count=len(results),
    )
