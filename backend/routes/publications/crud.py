from datetime import datetime

from fastapi import APIRouter, Depends, Query
from typing import Optional, List, Literal

from backend.schemas.publications.enums import PublicationStatus, ContentType
from backend.schemas.publications.publication_base import PublicationCreate
from backend.schemas.publications.publication_update import PublicationUpdate
from backend.schemas.publications.publication_response import (
    PublicationResponse,
    PublicationListResponse,
)
from backend.services.publications.publication_service import PublicationService
from backend.services.publications.publication_create_service import PublicationCreateService
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.routes.publications.dependencies import (
    get_publication_service,
    get_create_service,
    get_query_service,
)
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


@router.get("/drafts", response_model=PublicationListResponse)
async def get_drafts(
    tag_names: Optional[List[str]] = None,
    tag_ids: Optional[List[int]] = None,
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    query_service: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await query_service.get_publications(
        owner_id=current_user.id,
        status=PublicationStatus.DRAFT,
        tag_names=tag_names,
        tag_ids=tag_ids,
        skip=skip,
        limit=page_size,
    )
    return PublicationListResponse(items=publications, page=page, page_size=page_size)


@router.get("/scheduled", response_model=PublicationListResponse)
async def get_scheduled(
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    query_service: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await query_service.get_publications(
        owner_id=current_user.id,
        status=PublicationStatus.SCHEDULED,
        skip=skip,
        limit=page_size,
    )
    return PublicationListResponse(items=publications, page=page, page_size=page_size)


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
    sort_order: Optional[Literal["asc", "desc"]] = Query(None),
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    query_service: PublicationQueryService = Depends(get_query_service),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await query_service.get_publications(
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
        limit=page_size,
    )
    return PublicationListResponse(items=publications, page=page, page_size=page_size)


@router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_publication(publication_id, owner_id=current_user.id)


@router.put("/{publication_id}", response_model=PublicationResponse)
async def update_publication(
    publication_id: int,
    data: PublicationUpdate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_publication(publication_id, data, owner_id=current_user.id)


@router.patch("/{publication_id}", response_model=PublicationResponse)
async def patch_publication(
    publication_id: int,
    data: PublicationUpdate,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_publication(publication_id, data, owner_id=current_user.id)


@router.delete("/{publication_id}", status_code=204)
async def delete_publication(
    publication_id: int,
    service: PublicationService = Depends(get_publication_service),
    current_user: User = Depends(get_current_user),
):
    await service.delete_publication(publication_id, owner_id=current_user.id)
