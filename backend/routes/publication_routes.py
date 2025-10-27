"""
API endpoints для модуля публикаций.
CRUD операции, календарь, предпросмотр, AI редактор.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from backend.models.publication import (
    PublicationCreate,
    PublicationUpdate,
    PublicationResponse,
    PublicationStatus,
    PublicationPreview,
    CalendarEvent,
    PublicationNotification,
    PublicationNotificationCreate,
    RescheduleRequest,
    AITextRequest,
    AITextResponse,
    SeriesCreate,
    SeriesResponse,
)
from backend.services.publication_service import PublicationService


router = APIRouter(prefix="/publications", tags=["publications"])
service = PublicationService()


@router.post("", response_model=PublicationResponse, status_code=201)
async def create_publication(data: PublicationCreate) -> PublicationResponse:
    """Создание новой публикации."""
    return service.create(data)


@router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(publication_id: str) -> PublicationResponse:
    """Получение публикации по ID."""
    publication = service.get(publication_id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


@router.get("", response_model=List[PublicationResponse])
async def list_publications(
    status: Optional[PublicationStatus] = None,
    tags: Optional[List[str]] = Query(None),
    channel_id: Optional[str] = None,
    series_id: Optional[str] = None,
) -> List[PublicationResponse]:
    """Список публикаций с фильтрацией."""
    return service.list(status=status, tags=tags, channel_id=channel_id, series_id=series_id)


@router.put("/{publication_id}", response_model=PublicationResponse)
async def update_publication(publication_id: str, data: PublicationUpdate) -> PublicationResponse:
    """Обновление публикации."""
    publication = service.update(publication_id, data)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


@router.delete("/{publication_id}", status_code=204)
async def delete_publication(publication_id: str):
    """Удаление публикации."""
    if not service.delete(publication_id):
        raise HTTPException(status_code=404, detail="Publication not found")


@router.post("/preview", response_model=PublicationPreview)
async def preview_publication(data: PublicationCreate) -> PublicationPreview:
    """Предпросмотр публикации перед публикацией."""
    return service.preview(data)


@router.get("/calendar/{year}/{month}", response_model=List[CalendarEvent])
async def get_calendar(year: int, month: int) -> List[CalendarEvent]:
    """Календарь публикаций за указанный месяц."""
    return service.get_calendar(year, month)


@router.patch("/{publication_id}/reschedule", response_model=PublicationResponse)
async def reschedule_publication(publication_id: str, data: RescheduleRequest) -> PublicationResponse:
    """Перенос публикации на другое время."""
    publication = service.reschedule(publication_id, data.scheduled_at, data.timezone)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


@router.post("/series", response_model=SeriesResponse, status_code=201)
async def create_series(data: SeriesCreate) -> SeriesResponse:
    """Создание сериала публикаций."""
    return service.create_series(data)


@router.get("/series/{series_id}", response_model=SeriesResponse)
async def get_series(series_id: str) -> SeriesResponse:
    """Получение сериала по ID."""
    series = service.get_series(series_id)
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series


@router.post("/ai/text", response_model=AITextResponse)
async def ai_text_editor(request: AITextRequest) -> AITextResponse:
    """AI текстовый редактор для генерации/редактирования."""
    return service.ai_generate_text(request)


@router.post("/notify", response_model=PublicationNotification)
async def send_notification(data: PublicationNotificationCreate) -> PublicationNotification:
    """Отправка уведомления о статусе публикации."""
    return service.notify(
        publication_id=data.publication_id,
        status=data.status,
        message=data.message,
        channel_id=data.channel_id,
        error_details=data.error_details,
    )

