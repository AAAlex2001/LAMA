from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.inbox.events import InboxListResponse, BulkActionRequest, SpecificActionRequest
from backend.schemas.inbox.enums import InboxCategory, EventStatus, SortDir, EntityType, EventType
from backend.services.inbox.query_service import InboxQueryService
from backend.services.inbox.action_service import InboxActionService
from backend.routes.inbox.dependencies import get_inbox_query_service, get_inbox_action_service

router = APIRouter()

@router.get("/", response_model=InboxListResponse)
async def list_inbox_events(
    category: Optional[InboxCategory] = Query(None, description="ALL -> do not pass this parameter"),
    status: Optional[EventStatus] = Query(None, description="new, processed, ignored"),
    entity_type: Optional[EntityType] = Query(None, description="bot, channel, system"),
    entity_ids: Optional[str] = Query(None, description="Comma separated IDs of channels or bots"),
    event_types: Optional[str] = Query(None, description="Comma separated EventType enums"),
    sort: SortDir = Query(SortDir.NEW_FIRST),
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    query_service: InboxQueryService = Depends(get_inbox_query_service)
):
    ids_list = None
    if entity_ids:
        try:
            ids_list = [int(i.strip()) for i in entity_ids.split(",") if i.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="entity_ids must be a comma-separated list of integers")

    event_types_list = None
    if event_types:
        try:
            event_types_list = [EventType(e.strip()) for e in event_types.split(",") if e.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid event type provided in list")

    items, total = await query_service.get_events(
        owner_id=current_user.id,
        category=category,
        status=status,
        entity_type=entity_type,
        entity_ids=ids_list,
        event_types=event_types_list,
        sort_dir=sort,
        limit=limit,
        offset=offset
    )

    results = []
    for item in items:
        data = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        data['is_new'] = (item.status == EventStatus.NEW)
        results.append(data)

    return InboxListResponse(
        items=results,
        total=total
    )

@router.post("/bulk-action")
async def bulk_inbox_action(
    request: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    action_service: InboxActionService = Depends(get_inbox_action_service)
):
    """
    Execute bulk actions (read, delete, ignore) over selection or all notifications
    """
    affected = await action_service.execute_bulk_action(
        owner_id=current_user.id,
        event_ids=request.event_ids,
        action=request.action,
        apply_to_all=request.apply_to_all
    )
    return {"status": "success", "affected_rows": affected}


@router.post("/{event_id}/action")
async def execute_specific_action(
    event_id: int,
    request: SpecificActionRequest,
    current_user: User = Depends(get_current_user),
    action_service: InboxActionService = Depends(get_inbox_action_service)
):
    """
    Execute specific action: reply, accept, reject, unban, edit_ban
    """
    event = await action_service.get_event(event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    success = await action_service.execute_specific_action(
        event=event,
        action_type=request.action_type,
        payload=request.payload
    )

    if not success:
        raise HTTPException(status_code=400, detail=f"Failed to execute action {request.action_type}")
