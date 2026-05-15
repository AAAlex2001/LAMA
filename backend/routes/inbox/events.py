from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.inbox.enums import EventStatus, EventType, InboxCategory, SortDir
from backend.schemas.inbox.events import InboxListResponse
from backend.services.inbox.features.list_events import ListInboxEvents

router = APIRouter()


def parse_int_list(raw: Optional[str]) -> Optional[List[int]]:
    if not raw:
        return None
    try:
        return [int(i.strip()) for i in raw.split(",") if i.strip()]
    except ValueError:
        return None


def parse_event_types(raw: Optional[str]) -> Optional[List[EventType]]:
    if not raw:
        return None
    return [EventType(e.strip()) for e in raw.split(",") if e.strip()]


def serialize_event(item, bot_map) -> dict:
    data = {c.name: getattr(item, c.name) for c in item.__table__.columns}
    data["is_new"] = item.status == EventStatus.NEW
    if item.bot_id is not None:
        meta = bot_map.get(int(item.bot_id))
        if meta:
            data["tg_bot_username"] = meta.tg_bot_username
            data["tg_bot_name"] = meta.tg_bot_name
    return data


@router.get(
    "/",
    response_model=InboxListResponse,
    summary="Список событий inbox с фильтрами",
    description=(
        "Возвращает пагинированный список событий текущего юзера. "
        "Поддерживает фильтры по `category`, `status`, `bot_ids` (CSV), "
        "`channel_ids` (CSV), `event_types` (CSV), `system` (системные события), "
        "и флагам типов автоматизации `type_auto_replies`/`type_triggers`/`type_commands`. "
        "Сортировка по `created_at`: NEW_FIRST / OLD_FIRST."
    ),
)
async def list_inbox_events(
    category: Optional[InboxCategory] = Query(None),
    status: Optional[EventStatus] = Query(None),
    bot_ids: Optional[str] = Query(None),
    channel_ids: Optional[str] = Query(None),
    system: Optional[bool] = Query(None),
    type_auto_replies: Optional[bool] = Query(None),
    type_triggers: Optional[bool] = Query(None),
    type_commands: Optional[bool] = Query(None),
    event_types: Optional[str] = Query(None),
    sort: SortDir = Query(SortDir.NEW_FIRST),
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total, bot_map = await ListInboxEvents(db).execute(
        owner_id=current_user.id,
        category=category,
        status=status,
        bot_ids=parse_int_list(bot_ids),
        channel_ids=parse_int_list(channel_ids),
        include_system=system,
        type_auto_replies=type_auto_replies,
        type_triggers=type_triggers,
        type_commands=type_commands,
        event_types=parse_event_types(event_types),
        sort_dir=sort,
        limit=limit,
        offset=offset,
    )

    return InboxListResponse(
        items=[serialize_event(item, bot_map) for item in items],
        total=total,
        has_more=(offset + limit) < total,
    )
