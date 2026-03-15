from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends

from backend.schemas.publications.common import RescheduleRequest
from backend.schemas.publications.publication_response import PublicationResponse
from backend.schemas.publications.publishing import EditPublishedRequest
from backend.models.publications import PublicationStatus as DBPublicationStatus
from backend.celery.tasks import publish_publication
from backend.services.publications.publication_service import PublicationService
from backend.routes.publications.dependencies import get_publication_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{publication_id}/publish", response_model=PublicationResponse, status_code=202)
async def publish_now(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    publication = await service.prepare_for_publishing(publication_id, owner_id=current_user.id)

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
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.reschedule_publication(
        publication_id, data.scheduled_time, owner_id=current_user.id
    )


@router.post("/{publication_id}/edit-published")
async def edit_published_message(
    publication_id: int,
    data: EditPublishedRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    result = await service.edit_published_message(publication_id, data, owner_id=current_user.id)
    return result


@router.delete("/{publication_id}/telegram-messages")
async def delete_telegram_messages(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    result = await service.delete_telegram_messages(publication_id, owner_id=current_user.id)
    return result
