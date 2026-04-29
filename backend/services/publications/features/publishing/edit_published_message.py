"""Оркестратор редактирования опубликованного сообщения по всем каналам."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import ContentType as DBContentType, Publication
from backend.schemas.publications.publishing import (
    ChannelPublishResult,
    EditMessageResult,
    EditPublishedRequest,
)
from backend.services.publications.features.publishing.edit_telegram_message import (
    edit_single_message,
)
from backend.utils.keyboard import build_keyboard


class EditPublishedMessage:
    """Редактирует все TelegramMessage публикации; обновляет Publication при ≥1 успехе."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        publication: Publication,
        request: EditPublishedRequest,
        get_bot_callback,
    ) -> EditMessageResult:
        if not publication.telegram_messages:
            return empty_result("No Telegram messages found for publication")

        validation_error = validate_editability(publication)
        if validation_error:
            return empty_result(validation_error)

        new_text = request.text_content if request.text_content is not None else publication.text_content
        requested_media = request.media_urls if request.media_urls is not None else publication.media_urls
        reply_markup = build_reply_markup(publication, request)

        results = await edit_each_message(
            publication, request, new_text, requested_media, reply_markup, get_bot_callback,
        )

        success_count = sum(1 for r in results if r.success)
        if success_count > 0:
            update_publication_after_edit(publication, request)
            await self.db.flush()
            await self.db.refresh(publication)

        return EditMessageResult(
            success=success_count > 0,
            results=results,
            success_count=success_count,
            total_count=len(results),
        )


def empty_result(error: str) -> EditMessageResult:
    """Ранний exit-результат когда редактировать нечего."""
    return EditMessageResult(
        success=False, error=error,
        results=[], success_count=0, total_count=0,
    )


def validate_editability(publication: Publication) -> Optional[str]:
    """Сообщение об ошибке если публикация не редактируема (poll/quiz, альбом)."""
    if publication.content_type in (DBContentType.POLL, DBContentType.QUIZ):
        return "Editing poll or quiz messages via Telegram API is not supported"
    if (
        publication.content_type == DBContentType.TEXT_WITH_MEDIA
        and publication.media_urls
        and len(publication.media_urls) > 1
    ):
        return "Editing media albums is not supported by the Telegram Bot API"
    return None


def build_reply_markup(publication: Publication, request: EditPublishedRequest):
    """InlineKeyboard из request (если передан) или из текущей публикации."""
    if request.inline_keyboard is not None:
        data: Optional[Dict[str, Any]] = (
            request.inline_keyboard.model_dump()
            if hasattr(request.inline_keyboard, "model_dump")
            else request.inline_keyboard
        )
    else:
        data = publication.inline_keyboard
    return build_keyboard(data) if data else None


async def edit_each_message(
    publication: Publication,
    request: EditPublishedRequest,
    new_text: Optional[str],
    requested_media: Optional[List[str]],
    reply_markup,
    get_bot_callback,
) -> List[ChannelPublishResult]:
    """Последовательное редактирование всех TelegramMessage публикации."""
    results: List[ChannelPublishResult] = []
    for tg_msg in publication.telegram_messages:
        result = await edit_single_message(
            tg_msg, publication, request, new_text, requested_media, reply_markup, get_bot_callback,
        )
        results.append(result)
    return results


def update_publication_after_edit(
    publication: Publication, request: EditPublishedRequest,
) -> None:
    """Применяет request к Publication (text/keyboard/media) + updated_at."""
    if request.text_content is not None:
        publication.text_content = request.text_content
    if request.inline_keyboard is not None:
        publication.inline_keyboard = (
            request.inline_keyboard.model_dump() if request.inline_keyboard else None
        )
    if request.media_urls is not None:
        publication.media_urls = request.media_urls
    publication.updated_at = datetime.now(timezone.utc)
