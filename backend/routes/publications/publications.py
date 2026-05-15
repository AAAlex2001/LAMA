from datetime import datetime, timezone as dt_tz
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, Path, Query
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


@router.post(
    "/",
    response_model=PublicationResponse,
    status_code=201,
    summary="Создать публикацию",
)
async def create_publication(
    data: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreatePublication(db).execute(data, owner_id=current_user.id)


@router.get(
    "/drafts",
    response_model=PublicationCompactListResponse,
    summary="Список черновиков",
)
async def get_drafts(
    tag_names: Optional[List[str]] = Query(
        None, description="Фильтр по именам тегов (можно передать несколько)."
    ),
    tag_ids: Optional[List[int]] = Query(
        None, description="Фильтр по id тегов."
    ),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1."),
    page_size: int = Query(50, ge=1, le=200, description="Размер страницы."),
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


@router.get(
    "/scheduled",
    response_model=PublicationCompactListResponse,
    summary="Список запланированных публикаций",
)
async def get_scheduled(
    page: int = Query(1, ge=1, description="Номер страницы."),
    page_size: int = Query(50, ge=1, le=200, description="Размер страницы."),
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


@router.get(
    "/",
    response_model=PublicationCompactListResponse,
    summary="Список публикаций с фильтрами",
)
async def get_publications(
    status: Optional[PublicationStatus] = Query(
        None, description="Фильтр по статусу: draft / scheduled / published / failed / deleted."
    ),
    content_type: Optional[ContentType] = Query(
        None, description="Фильтр по типу контента: text / image / video / poll и т.д."
    ),
    channel_id: Optional[int] = Query(
        None, description="Только публикации, привязанные к этому каналу."
    ),
    tag_names: Optional[List[str]] = Query(None, description="Фильтр по именам тегов."),
    tag_ids: Optional[List[int]] = Query(None, description="Фильтр по id тегов."),
    series_id: Optional[int] = Query(None, description="Только публикации из этой серии."),
    start_date: Optional[datetime] = Query(
        None, description="Нижняя граница периода по дате (см. date_mode)."
    ),
    end_date: Optional[datetime] = Query(
        None, description="Верхняя граница периода по дате."
    ),
    search: Optional[str] = Query(None, description="Поиск по text_content."),
    sort_order: Optional[Literal["asc", "desc"]] = Query(
        None, description="Сортировка по scheduled_time."
    ),
    date_mode: PublicationDateMode = Query(
        default=PublicationDateMode.scheduled,
        description="К какому полю применять start_date/end_date: scheduled или created.",
    ),
    is_ad: Optional[bool] = Query(None, description="Только посты с галкой «реклама»."),
    tz: str = Query(
        "UTC",
        description="Часовой пояс пользователя — start_date/end_date переводятся из локального в UTC.",
    ),
    page: int = Query(1, ge=1, description="Номер страницы."),
    page_size: int = Query(50, ge=1, le=200, description="Размер страницы."),
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
        is_ad=is_ad,
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


@router.get(
    "/week-batch",
    response_model=WeekBatchResponse,
    summary="Календарь на диапазон дат (всё разом)",
)
async def get_week_batch(
    start_date: datetime = Query(..., description="Начало диапазона (включительно)."),
    end_date: datetime = Query(..., description="Конец диапазона (включительно)."),
    per_day: int = Query(
        20,
        ge=1,
        le=50,
        description="Сколько публикаций возвращать на один день.",
    ),
    tz: str = Query("UTC", description="Часовой пояс юзера для группировки по дням."),
    is_ad: Optional[bool] = Query(None, description="Только рекламные публикации."),
    status: Optional[Literal["scheduled", "published"]] = Query(
        None, description="Фильтр по статусу публикации."
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await GetWeekBatch(db).execute(
        owner_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        per_day=per_day,
        tz=tz,
        is_ad=is_ad,
        status=status,
    )


@router.get(
    "/{publication_id}",
    response_model=PublicationResponse,
    summary="Получить публикацию по id",
)
async def get_publication(
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await find_publication_or_404(db, publication_id, owner_id=current_user.id)


@router.put(
    "/{publication_id}",
    response_model=PublicationResponse,
    summary="Полное обновление публикации",
)
async def update_publication(
    data: PublicationUpdate,
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await UpdatePublication(db).execute(publication, data, owner_id=current_user.id)


@router.patch(
    "/{publication_id}",
    response_model=PublicationResponse,
    summary="Частичное обновление публикации",
)
async def patch_publication(
    data: PublicationUpdate,
    publication_id: int = Path(..., description="ID публикации."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    publication = await find_publication_or_404(db, publication_id, owner_id=current_user.id)
    return await UpdatePublication(db).execute(publication, data, owner_id=current_user.id)


@router.delete(
    "/{publication_id}",
    status_code=204,
    summary="Удалить публикацию (с опциями для повторов и удаления из канала)",
)
async def delete_publication(
    publication_id: int = Path(..., description="ID публикации."),
    delete_from_channel: bool = Query(
        False,
        description="Если true и публикация опубликована — поставит celery-задачу на удаление сообщений в Telegram.",
    ),
    repeat_mode: Optional[Literal["this", "this_and_following"]] = Query(
        None,
        description=(
            "Для повторяющихся публикаций. "
            "'this' — добавить дату repeat_date в исключения (пропустить только этот повтор). "
            "'this_and_following' — обрезать повтор по repeat_date (удалить этот и все будущие)."
        ),
    ),
    repeat_date: Optional[str] = Query(
        None,
        description="Дата конкретного повтора (ISO 8601) — требуется при repeat_mode.",
    ),
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
