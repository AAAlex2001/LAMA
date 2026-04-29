from datetime import datetime, timezone as dt_tz
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.tasks import delete_publication_messages
from backend.database import get_db
from backend.models.auth import User
from backend.models.publications import (
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.routes.auth import get_current_user
from backend.schemas.publications.publications import (
    PublicationCompactListResponse,
    PublicationCreate,
    PublicationResponse,
    PublicationUpdate,
    WeekBatchResponse,
)
from backend.schemas.publications.enums import ContentType, PublicationDateMode, PublicationStatus
from backend.services.publications.features.publications.add_repeat_exclusion import AddRepeatExclusion
from backend.services.publications.features.publications.create_publication import CreatePublication
from backend.services.publications.features.publications.delete_publication import DeletePublication
from backend.services.publications.features.publications.get_bot_messages_in_range import (
    GetBotMessagesInRange,
)
from backend.services.publications.features.publications.get_week_batch import GetWeekBatch
from backend.services.publications.features.publications.list_publications import ListPublications
from backend.services.publications.features.publications.lookup import find_publication_or_404
from backend.services.publications.features.publications.stop_repeat_from import StopRepeatFrom
from backend.services.publications.features.publications.update_publication import UpdatePublication
from backend.services.publications.utils.repeat_utils import local_range_to_utc

router = APIRouter()


@router.post("/", response_model=PublicationResponse, status_code=201)
async def create_publication(
    data: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreatePublication(db).execute(data, owner_id=current_user.id)


@router.get("/drafts", response_model=PublicationCompactListResponse)
async def get_drafts(
    tag_names: Optional[List[str]] = None,
    tag_ids: Optional[List[int]] = None,
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await ListPublications(db).execute(
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    publications = await ListPublications(db).execute(
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
    date_mode: PublicationDateMode = Query(default=PublicationDateMode.scheduled),
    tz: str = Query("UTC"),
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    q_start, q_end = start_date, end_date
    if start_date and end_date and tz != "UTC":
        q_start, q_end = local_range_to_utc(start_date, end_date, tz)

    publications = await ListPublications(db).execute(
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
        date_mode=date_mode.value,
        skip=skip,
        limit=page_size,
    )
    bot_messages = []
    if q_start and q_end:
        bot_messages = await GetBotMessagesInRange(db).execute(
            owner_id=current_user.id, start_date=q_start, end_date=q_end,
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await GetWeekBatch(db).execute(
        owner_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        per_day=per_day,
        tz=tz,
    )


@router.get("/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    publication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_publication_or_404(db, publication_id, owner_id=current_user.id)


@router.put("/{publication_id}", response_model=PublicationResponse)
async def update_publication(
    publication_id: int,
    data: PublicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await UpdatePublication(db).execute(publication, data, owner_id=current_user.id)


@router.patch("/{publication_id}", response_model=PublicationResponse)
async def patch_publication(
    publication_id: int,
    data: PublicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await UpdatePublication(db).execute(publication, data, owner_id=current_user.id)


@router.delete("/{publication_id}", status_code=204)
async def delete_publication(
    publication_id: int,
    delete_from_channel: bool = Query(False),
    repeat_mode: Optional[Literal["this", "this_and_following"]] = Query(None),
    repeat_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)

    is_repeat = publication.repeat_interval and publication.repeat_interval != DBRepeatInterval.NEVER
    if is_repeat and repeat_mode:
        if repeat_mode == "this" and repeat_date:
            await AddRepeatExclusion(db).execute(publication, repeat_date[:10])
        elif repeat_mode == "this_and_following" and repeat_date:
            cut_off = datetime.fromisoformat(repeat_date).replace(tzinfo=dt_tz.utc)
            await StopRepeatFrom(db).execute(publication, cut_off)
        return

    if delete_from_channel and publication.status in (
        DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS,
    ):
        delete_publication_messages.delay(publication_id)
    else:
        await DeletePublication(db).execute(publication)
