from fastapi import APIRouter, Depends, HTTPException, Query, Path
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Literal
from datetime import datetime, timezone
import logging

from backend.schemas.publications import (
    PublicationCreate, PublicationUpdate, PublicationResponse,
    PublicationListResponse, PublicationStatus, ContentType,
    AIGenerateRequest, AIEditRequest, AIEditTextRequest, AIEditTextResponse,
    PublicationSeriesCreate, PublicationSeriesUpdate, PublicationSeriesResponse, CalendarEntry,
    RescheduleRequest, EditPublishedRequest,
    TagCreate, TagUpdate, TagResponse, TagListResponse,
    TextTemplateCreate, TextTemplateUpdate, TextTemplateResponse, TextTemplateListResponse,
)
from backend.models.publications import Tag, publication_tags, PublicationStatus as DBPublicationStatus, RepeatInterval as DBRepeatInterval
from backend.models.publications import PublicationSeries
from backend.celery.tasks import publish_publication
from backend.services.publications import PublicationService
from backend.services.publications.publications import calculate_next_repeat_time
from backend.database import get_db, AsyncSessionLocal
from backend.config import OPENAI_API_KEY
from backend.routes.auth import get_current_user
from backend.models.auth import User

logger = logging.getLogger(__name__)

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
        logger.info(f"Creating publication: media_urls={data.media_urls}, media_thumbnail_urls={data.media_thumbnail_urls}")
        publication = await service.create_publication(data, owner_id=current_user.id)
        logger.info(f"Created publication {publication.id}: media_thumbnail_urls={publication.media_thumbnail_urls}")
        return publication
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/drafts", response_model=PublicationListResponse)
async def get_drafts(
    tag_names: Optional[List[str]] = None,
    tag_ids: Optional[List[int]] = None,
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить все черновики"""
    skip = (page - 1) * page_size
    publications = await service.get_publications(
        owner_id=current_user.id,
        status=PublicationStatus.DRAFT,
        tag_names=tag_names,
        tag_ids=tag_ids,
        skip=skip,
        limit=page_size
    )
    
    return PublicationListResponse(
        items=publications,
        page=page,
        page_size=page_size
    )


@router.get("/scheduled", response_model=PublicationListResponse)
async def get_scheduled(
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить все запланированные публикации"""
    skip = (page - 1) * page_size
    publications = await service.get_publications(
        owner_id=current_user.id,
        status=PublicationStatus.SCHEDULED,
        skip=skip,
        limit=page_size
    )
    
    return PublicationListResponse(
        items=publications,
        page=page,
        page_size=page_size
    )


@router.get("/", response_model=PublicationListResponse)
async def get_publications(
    status: Optional[PublicationStatus] = None,
    content_type: Optional[ContentType] = None,
    channel_id: Optional[int] = None,
    tag_names: Optional[List[str]] = None,
    tag_ids: Optional[List[int]] = None,
    series_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_order: Optional[Literal['asc', 'desc']] = Query(None),
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить список публикаций с фильтрацией"""
    skip = (page - 1) * page_size
    publications = await service.get_publications(
        owner_id=current_user.id,
        status=status,
        content_type=content_type,
        channel_id=channel_id,
        tag_names=tag_names,
        tag_ids=tag_ids,
        series_id=series_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        sort_order=sort_order,
        skip=skip,
        limit=page_size
    )
    
    return PublicationListResponse(
        items=publications,
        page=page,
        page_size=page_size
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
        entries.append(CalendarEntry(
            date=date_str,
            publications=publications
        ))

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
        return publication
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/edit-text", response_model=AIEditTextResponse)
async def edit_text_with_ai(
    request: AIEditTextRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Редактировать текст с помощью AI без привязки к публикации"""
    try:
        result = await service.edit_text_with_ai(request.text, request.instruction)
        return AIEditTextResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/edit-text-stream")
async def edit_text_with_ai_stream(
    request: AIEditTextRequest,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Редактировать текст с помощью AI со streaming"""
    async def generate():
        try:
            async for chunk in service.edit_text_with_ai_stream(request.text, request.instruction):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/series", response_model=PublicationSeriesResponse, status_code=201)
async def create_series(
    data: PublicationSeriesCreate,
    service: PublicationService = Depends(get_publication_service)
):
    """Создать серию публикаций"""
    series = await service.create_series(
        name=data.name,
        description=data.description,
        reply_to_previous=data.reply_to_previous
    )
    return series


@router.patch("/series/{series_id}", response_model=PublicationSeriesResponse)
async def update_series(
    series_id: int,
    data: PublicationSeriesUpdate,
    db: AsyncSession = Depends(get_db),
    service: PublicationService = Depends(get_publication_service)
):
    """Обновить серию публикаций"""
    result = await db.execute(select(PublicationSeries).where(PublicationSeries.id == series_id))
    series = result.scalar_one_or_none()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(series, field, value)

    await db.commit()
    await db.refresh(series)
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
    return publication


@router.patch("/{publication_id}", response_model=PublicationResponse)
async def patch_publication(
    publication_id: int,
    data: PublicationUpdate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Частично обновить публикацию"""
    publication = await service.update_publication(publication_id, data, owner_id=current_user.id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
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


@router.post("/{publication_id}/share", response_model=dict)
async def generate_share_link(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Генерировать токен для шеринга черновика"""
    token = await service.generate_share_token(publication_id, owner_id=current_user.id)
    if not token:
        raise HTTPException(status_code=404, detail="Publication not found")
    return {"share_token": token}


@router.get("/shared/{token}", response_model=PublicationResponse)
async def get_shared_publication(
    token: str,
    service: PublicationService = Depends(get_publication_service)
):
    """Получить публикацию по share токену (публичный доступ)"""
    publication = await service.get_publication_by_share_token(token)
    if not publication:
        raise HTTPException(status_code=404, detail="Shared publication not found")
    return publication


@router.post("/shared/{token}/consume", response_model=dict)
async def consume_shared_publication_token(
    token: str,
    service: PublicationService = Depends(get_publication_service)
):
    """Пометить share-токен как использованный (после сохранения/публикации получателем)."""
    ok = await service.consume_share_token(token)
    if not ok:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    return {"success": True}


@router.post("/{publication_id}/publish", response_model=PublicationResponse, status_code=202)
async def publish_now(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Опубликовать сейчас"""
    publication = await service.get_publication(publication_id, owner_id=current_user.id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")

    if not publication.channels:
        raise HTTPException(status_code=400, detail="No channels selected")
    
    # Only mark as SCHEDULED; Celery task will set PUBLISHED after actual send
    publication.status = DBPublicationStatus.SCHEDULED
    publication.published_time = datetime.now(timezone.utc)
    await service.db.commit()
    
    publish_publication.apply_async(args=[publication_id], queue="high")
    logger.info("Publish queued (publication_id=%s)", publication_id)
    
    await service.db.refresh(publication)
    return publication


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
        data,
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
        return publication
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ Tags ============


@router.get("/tags/", response_model=TagListResponse)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список тегов.
    Сортировка по дате последнего использования (недавние первыми).
    """
    tags_query = (
        select(Tag)
        .where(Tag.owner_id == current_user.id)
        .order_by(Tag.last_used_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    
    result = await db.execute(tags_query)
    tags = list(result.scalars().all())
    
    total_query = select(func.count(Tag.id)).where(Tag.owner_id == current_user.id)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0
    
    return TagListResponse(
        items=tags,
        total=total
    )


@router.get("/tags/search", response_model=TagListResponse)
async def search_tags(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Поиск тегов по имени"""
    query = (
        select(Tag)
        .where(Tag.owner_id == current_user.id)
        .where(Tag.name.ilike(f"%{q.replace('%', '').replace('_', '')}%"))
        .order_by(Tag.name)
        .limit(limit)
    )
    
    result = await db.execute(query)
    tags = list(result.scalars().all())

    return TagListResponse(
        items=tags,
        total=len(tags)
    )


@router.post("/tags/", response_model=TagResponse, status_code=201)
async def create_tag(
    data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новый тег"""
    existing_query = select(Tag).where(
        Tag.owner_id == current_user.id,
        Tag.name == data.name
    )
    existing_result = await db.execute(existing_query)
    existing_tag = existing_result.scalar_one_or_none()
    
    if existing_tag:
        if data.color and existing_tag.color != data.color:
            existing_tag.color = data.color
            await db.commit()
            await db.refresh(existing_tag)
        return existing_tag
    
    tag = Tag(name=data.name, color=data.color, owner_id=current_user.id)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    return tag


@router.put("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Tag).where(Tag.id == tag_id, Tag.owner_id == current_user.id)
    result = await db.execute(query)
    tag = result.scalar_one_or_none()

    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if data.name is not None and data.name != tag.name:
        dup_query = select(Tag).where(
            Tag.owner_id == current_user.id,
            Tag.name == data.name,
            Tag.id != tag_id
        )
        dup_result = await db.execute(dup_query)
        if dup_result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Tag with this name already exists")
        tag.name = data.name

    if data.color is not None:
        tag.color = data.color

    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить тег"""
    query = select(Tag).where(
        Tag.id == tag_id,
        Tag.owner_id == current_user.id
    )
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    await db.delete(tag)
    await db.commit()


@router.post("/text-templates/", response_model=TextTemplateResponse, status_code=201)
async def create_text_template_route(
    data: TextTemplateCreate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Создать новый текстовый шаблон"""
    template = await service.create_text_template(current_user.id, data)
    return template


@router.get("/text-templates/", response_model=TextTemplateListResponse)
async def list_text_templates_route(
    search: Optional[str] = Query(None, description="Поиск по названию"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить список шаблонов пользователя"""
    templates, total = await service.get_text_templates(current_user.id, search, skip, limit)
    return TextTemplateListResponse(items=templates, total=total)


@router.get("/text-templates/{template_id}", response_model=TextTemplateResponse)
async def get_text_template_route(
    template_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Получить шаблон по ID"""
    template = await service.get_text_template_by_id(template_id, current_user.id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.patch("/text-templates/{template_id}", response_model=TextTemplateResponse)
async def update_text_template_route(
    template_id: int,
    data: TextTemplateUpdate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Обновить текстовый шаблон"""
    template = await service.update_text_template(template_id, current_user.id, data)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete("/text-templates/{template_id}", status_code=204)
async def delete_text_template_route(
    template_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user)
):
    """Удалить текстовый шаблон"""
    success = await service.delete_text_template(template_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return None

