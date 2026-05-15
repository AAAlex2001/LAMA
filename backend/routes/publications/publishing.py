import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.tasks import publish_publication
from backend.database import get_db
from backend.models.auth import User
from backend.models.publications import PublicationStatus as DBPublicationStatus
from backend.routes.auth import get_current_user
from backend.schemas.publications.common import RescheduleRequest
from backend.schemas.publications.publications import PublicationResponse
from backend.schemas.publications.publishing import EditPublishedRequest
from backend.services.bot_provider import resolve_for_channel
from backend.services.publications.features.publications.lookup import find_publication_or_404
from backend.services.publications.features.publications.reschedule_publication import (
    ReschedulePublication,
)
from backend.services.publications.features.publishing.delete_telegram_messages import (
    DeleteTelegramMessages,
)
from backend.services.publications.features.publishing.edit_published_message import (
    EditPublishedMessage,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/{publication_id}/publish",
    response_model=PublicationResponse,
    status_code=202,
    summary="Опубликовать прямо сейчас (ставит celery-задачу)",
)
async def publish_now(
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    if not publication.channels:
        raise HTTPException(status_code=400, detail="No channels selected")

    publication.status = DBPublicationStatus.SCHEDULED
    publication.published_time = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(publication)

    if publication.series_id and publication.series_order and publication.series_order > 0:
        logger.info(
            "Series post deferred (publication_id=%s, series_order=%s)",
            publication_id, publication.series_order,
        )
        return publication

    publish_publication.apply_async(args=[publication_id], queue="high")
    logger.info("Publish queued (publication_id=%s)", publication_id)
    return publication


@router.post(
    "/{publication_id}/reschedule",
    response_model=PublicationResponse,
    summary="Перенести время публикации (статус → SCHEDULED)",
)
async def reschedule_publication(
    data: RescheduleRequest,
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await ReschedulePublication(db).execute(publication, data.scheduled_time)


@router.post(
    "/{publication_id}/edit-published",
    summary="Отредактировать уже опубликованное сообщение в Telegram",
)
async def edit_published_message(
    data: EditPublishedRequest,
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await EditPublishedMessage(db).execute(
        publication, data, lambda ch: resolve_for_channel(db, ch),
    )


@router.delete(
    "/{publication_id}/telegram-messages",
    summary="Удалить отправленные сообщения публикации в Telegram (БД-публикация остаётся)",
)
async def delete_telegram_messages(
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await DeleteTelegramMessages(db).execute(
        publication, lambda ch: resolve_for_channel(db, ch),
    )
