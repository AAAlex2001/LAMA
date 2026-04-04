from datetime import datetime

from fastapi import APIRouter, Depends, Query
from typing import Optional, List, Literal

from backend.services.publications.repeat_utils import local_range_to_utc
from backend.schemas.publications.enums import PublicationStatus, ContentType
from backend.schemas.publications.publication_base import PublicationCreate
from backend.schemas.publications.publication_update import PublicationUpdate
from backend.schemas.publications.publication_response import (
    PublicationResponse,
    PublicationCompactListResponse,
    WeekBatchResponse,
)
from backend.services.publications.publication_create_service import PublicationCreateService
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.services.publications.publication_update_service import PublicationUpdateService
from backend.routes.publications.dependencies import get_create_service, get_query_service, get_update_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter()


@router.post("/", response_model=PublicationResponse, status_code=201)
async def create_publication(
    data: PublicationCreate,
    creator: PublicationCreateService = Depends(get_create_service),
    current_user: User = Depends(get_current_user),
):
    return await creator.create_publication(data, owner_id=current_user.id)


@router.get("/drafts", response_model=PublicationCompactListResponse)
async def get_drafts(
    tag_names: Optional[List[str]] = None,
    tag_ids: Optional[List[int]] = None,
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await query.get_publications_compact(
        owner_id=current_user.id,
        status=PublicationStatus.DRAFT,
        tag_names=tag_names,
        tag_ids=tag_ids,
        skip=skip,
        limit=page_size,
    )
    return PublicationCompactListResponse(items=publications, page=page, page_size=page_size)


@router.get("/scheduled", response_model=PublicationCompactListResponse)
async def get_scheduled(
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await query.get_publications_compact(
        owner_id=current_user.id,
        status=PublicationStatus.SCHEDULED,
        skip=skip,
        limit=page_size,
    )
    return PublicationCompactListResponse(items=publications, page=page, page_size=page_size)


@router.get("/", response_model=PublicationCompactListResponse)
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
    sort_order: Optional[Literal["asc", "desc"]] = Query(None),
    date_mode: Optional[Literal["scheduled", "published"]] = Query("scheduled"),
    tz: str = Query("UTC"),
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    q_start, q_end = start_date, end_date
    if start_date and end_date and tz != "UTC":
        q_start, q_end = local_range_to_utc(start_date, end_date, tz)
    publications = await query.get_publications_compact(
        owner_id=current_user.id,
        status=status,
        content_type=content_type,
        channel_id=channel_id,
        tag_names=tag_names,
        tag_ids=tag_ids,
        series_id=series_id,
        start_date=q_start,
        end_date=q_end,
        search=search,
        sort_order=sort_order,
        date_mode=date_mode,
        skip=skip,
        limit=page_size,
    )
    bot_messages = []
    if q_start and q_end:
        bot_messages = await query.get_bot_messages_in_range(
            owner_id=current_user.id,
            start_date=q_start,
            end_date=q_end,
        )
    return PublicationCompactListResponse(
        items=publications, page=page, page_size=page_size, bot_messages=bot_messages,
    )


@router.get("/week-batch", response_model=WeekBatchResponse)
async def get_week_batch(
    start_date: datetime,
    end_date: datetime,
    per_day: int = Query(20, ge=1, le=50),
    tz: str = Query("UTC"),
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    return await query.get_week_batch(
        owner_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        per_day=per_day,
        tz=tz,
    )


@router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    publication_id: int,
    query: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    return await query.get_publication_or_404(publication_id, owner_id=current_user.id)


@router.put("/{publication_id}", response_model=PublicationResponse)
async def update_publication(
    publication_id: int,
    data: PublicationUpdate,
    query: PublicationQueryService = Depends(get_query_service),
    updater: PublicationUpdateService = Depends(get_update_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    return await updater.update_publication(publication, data, owner_id=current_user.id)


@router.patch("/{publication_id}", response_model=PublicationResponse)
async def patch_publication(
    publication_id: int,
    data: PublicationUpdate,
    query: PublicationQueryService = Depends(get_query_service),
    updater: PublicationUpdateService = Depends(get_update_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    return await updater.update_publication(publication, data, owner_id=current_user.id)


@router.delete("/{publication_id}", status_code=204)
async def delete_publication(
    publication_id: int,
    query: PublicationQueryService = Depends(get_query_service),
    updater: PublicationUpdateService = Depends(get_update_service),
    current_user: User = Depends(get_current_user),
):
    publication = await query.get_publication_or_404(publication_id, owner_id=current_user.id)
    await updater.delete_publication(publication)
