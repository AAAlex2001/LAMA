from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from backend.schemas.publications import (
    PublicationCreate, PublicationUpdate, PublicationResponse,
    PublicationListResponse, PublicationStatus, ContentType,
    AIGenerateRequest, AIEditRequest,
    PublicationSeriesCreate, PublicationSeriesResponse, CalendarEntry,
    RescheduleRequest, EditPublishedRequest
)
from backend.services.publications import PublicationService
from backend.database import get_db
from backend.config import OPENAI_API_KEY
from backend.routes.auth import get_current_user
from backend.models.auth import User


router = APIRouter(prefix="/publications", tags=["publications"])


async def get_publication_service(
    db: AsyncSession = Depends(get_db)
) -> PublicationService:
    return PublicationService(db=db, openai_api_key=OPENAI_API_KEY)


@router.post("/", response_model=PublicationResponse, status_code=201)
async def create_publication(
    data: PublicationCreate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Создать новую публикацию (черновик)"""
    try:
        publication = await service.create_publication(data, owner_id=current_user.id)
        publication = await service.get_publication(publication.id, owner_id=current_user.id)
        return publication
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/drafts", response_model=PublicationListResponse)
async def get_drafts(
    page: int = 1,
    page_size: int = 50,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить все черновики"""
    skip = (page - 1) * page_size
    publications, total = await service.get_publications(
        owner_id=current_user.id,
        status=PublicationStatus.DRAFT,
        skip=skip,
        limit=page_size
    )
    
    pages = (total + page_size - 1) // page_size
    
    return PublicationListResponse(
        items=publications,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/scheduled", response_model=PublicationListResponse)
async def get_scheduled(
    page: int = 1,
    page_size: int = 50,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить все запланированные публикации"""
    skip = (page - 1) * page_size
    publications, total = await service.get_publications(
        owner_id=current_user.id,
        status=PublicationStatus.SCHEDULED,
        skip=skip,
        limit=page_size
    )
    
    pages = (total + page_size - 1) // page_size
    
    return PublicationListResponse(
        items=publications,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/", response_model=PublicationListResponse)
async def get_publications(
    status: Optional[PublicationStatus] = None,
    content_type: Optional[ContentType] = None,
    channel_id: Optional[int] = None,
    tag_names: Optional[List[str]] = None,
    series_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 50,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить список публикаций с фильтрацией"""
    skip = (page - 1) * page_size
    publications, total = await service.get_publications(
        owner_id=current_user.id,
        status=status,
        content_type=content_type,
        channel_id=channel_id,
        tag_names=tag_names,
        series_id=series_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=page_size
    )
    
    pages = (total + page_size - 1) // page_size
    
    return PublicationListResponse(
        items=publications,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/calendar/{year}/{month}")
async def get_calendar(
    year: int = Path(...),
    month: int = Path(..., ge=1, le=12),
    timezone: str = Query("UTC"),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить календарь публикаций за месяц"""
    calendar_data = await service.get_calendar(year, month, timezone, owner_id=current_user.id)
    
    entries = []
    for date_str, publications in calendar_data.items():
        entries.append(CalendarEntry(date=date_str, publications=publications))
    
    return {"calendar": entries}


@router.post("/ai/generate", response_model=PublicationResponse, status_code=201)
async def generate_content_with_ai(
    request: AIGenerateRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Сгенерировать контент с помощью AI и создать публикацию"""
    try:
        content = await service.generate_with_ai(request)

        publication_data = PublicationCreate(
            content_type=request.content_type,
            text_content=content,
            status=PublicationStatus.DRAFT,
            ai_generated=True,
            ai_prompt=request.prompt,
            channel_ids=[],
            tag_names=[]
        )
        
        publication = await service.create_publication(publication_data, owner_id=current_user.id)
        publication = await service.get_publication(publication.id, owner_id=current_user.id)
        return publication
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/series", response_model=PublicationSeriesResponse, status_code=201)
async def create_series(
    data: PublicationSeriesCreate,
    service: PublicationService = Depends(get_publication_service)
):
    """Создать серию публикаций"""
    series = await service.create_series(
        name=data.name,
        description=data.description
    )
    return series


@router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить публикацию по ID"""
    publication = await service.get_publication(publication_id, owner_id=current_user.id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


@router.put("/{publication_id}", response_model=PublicationResponse)
async def update_publication(
    publication_id: int,
    data: PublicationUpdate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Обновить публикацию"""
    publication = await service.update_publication(publication_id, data, owner_id=current_user.id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    publication = await service.get_publication(publication.id, owner_id=current_user.id)
    return publication


@router.delete("/{publication_id}", status_code=204)
async def delete_publication(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Удалить публикацию"""
    success = await service.delete_publication(publication_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Publication not found")


@router.post("/{publication_id}/publish")
async def publish_now(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Опубликовать сейчас"""
    result = await service.publish_now(publication_id, owner_id=current_user.id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Publication failed"))
    return result


@router.post("/{publication_id}/reschedule", response_model=PublicationResponse)
async def reschedule_publication(
    publication_id: int,
    data: RescheduleRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Перенести публикацию на другое время"""
    publication = await service.reschedule_publication(
        publication_id,
        data.scheduled_time,
        owner_id=current_user.id
    )
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    publication = await service.get_publication(publication.id, owner_id=current_user.id)
    return publication


@router.post("/{publication_id}/edit-published")
async def edit_published_message(
    publication_id: int,
    data: EditPublishedRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Редактировать уже опубликованное сообщение через Telegram API"""
    result = await service.edit_published_message(
        publication_id,
        data.new_text,
        owner_id=current_user.id
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Edit failed"))
    return result


@router.delete("/{publication_id}/telegram-messages")
async def delete_telegram_messages(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Удалить опубликованные сообщения из Telegram"""
    result = await service.delete_telegram_messages(publication_id, owner_id=current_user.id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Delete failed"))
    return result


@router.post("/{publication_id}/ai/edit", response_model=PublicationResponse)
async def edit_content_with_ai(
    publication_id: int,
    data: AIEditRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Редактировать контент публикации с помощью AI"""
    try:
        payload = data.model_copy(update={"publication_id": publication_id})
        publication = await service.edit_with_ai(payload, owner_id=current_user.id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        publication = await service.get_publication(publication.id, owner_id=current_user.id)
        return publication
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

