from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.schemas.publications.common import RescheduleRequest
from backend.schemas.publications.publication_response import PublicationResponse
from backend.schemas.publications.publishing import EditPublishedRequest
from backend.models.publications import PublicationStatus as DBPublicationStatus
from backend.celery.tasks import publish_publication
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.services.publications.publication_update_service import PublicationUpdateService
from backend.services.publications import message_editor
from backend.services.bot_provider import resolve_for_channel
from backend.routes.publications.dependencies import get_query_service, get_update_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{publication_id}/publish", response_model=PublicationResponse, status_code=202)
async def publish_now(
    publication_id: int,
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    if not publication.channels:
        raise HTTPException(status_code=400, detail="No channels selected")

    publication.status = DBPublicationStatus.SCHEDULED
    publication.published_time = datetime.now(timezone.utc)
    await query.db.flush()
    await query.db.refresh(publication)

    if publication.series_id and publication.series_order and publication.series_order > 0:
        logger.info("Series post deferred (publication_id=%s, series_order=%s)",
                    publication_id, publication.series_order)
        return publication

    publish_publication.apply_async(args=[publication_id], queue="high")
    logger.info("Publish queued (publication_id=%s)", publication_id)
    return publication


@router.post("/{publication_id}/reschedule", response_model=PublicationResponse)
async def reschedule_publication(
    publication_id: int,
    data: RescheduleRequest,
    query: PublicationQueryService = Depends(get_query_service),
    updater: PublicationUpdateService = Depends(get_update_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    return await updater.reschedule_publication(publication, data.scheduled_time)


@router.post("/{publication_id}/edit-published")
async def edit_published_message(
    publication_id: int,
    data: EditPublishedRequest,
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    return await message_editor.edit_published_message(
        publication, data, query.db, lambda ch: resolve_for_channel(query.db, ch),
    )


@router.delete("/{publication_id}/telegram-messages")
async def delete_telegram_messages(
    publication_id: int,
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    return await message_editor.delete_telegram_messages(
        publication, query.db, lambda ch: resolve_for_channel(query.db, ch),
    )
