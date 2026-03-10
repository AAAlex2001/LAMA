from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException

from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.inbox.events import InboxListResponse, BulkActionRequest, SpecificActionRequest, SpecificActionResult
from backend.schemas.inbox.enums import InboxCategory, EventStatus, SortDir, EventType
from backend.services.inbox.query_service import InboxQueryService
from backend.services.inbox.action_service import InboxActionService
from backend.routes.inbox.dependencies import get_inbox_query_service, get_inbox_action_service

router = APIRouter()


def parse_int_list(raw: Optional[str]) -> Optional[List[int]]:
    if not raw:
        return None
    try:
        return [int(i.strip()) for i in raw.split(",") if i.strip()]
    except ValueError:
        return None


@router.get("/", response_model=InboxListResponse)
async def list_inbox_events(
    category: Optional[InboxCategory] = Query(None, description="moderation | system | automation"),
    status: Optional[EventStatus] = Query(None, description="new, processed, ignored, banned"),
    bot_ids: Optional[str] = Query(None, description="Comma separated bot IDs"),
    channel_ids: Optional[str] = Query(None, description="Comma separated channel IDs"),
    system: Optional[bool] = Query(None, description="Include system events (errors, joins, etc.)"),
    type_auto_replies: Optional[bool] = Query(None, description="Include auto-reply events"),
    type_triggers: Optional[bool] = Query(None, description="Include trigger events"),
    type_commands: Optional[bool] = Query(None, description="Include command events"),
    event_types: Optional[str] = Query(None, description="Comma separated EventType enums"),
    sort: SortDir = Query(SortDir.NEW_FIRST),
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    query_service: InboxQueryService = Depends(get_inbox_query_service),
):
    parsed_bot_ids = parse_int_list(bot_ids)
    parsed_channel_ids = parse_int_list(channel_ids)

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
        bot_ids=parsed_bot_ids,
        channel_ids=parsed_channel_ids,
        include_system=system,
        type_auto_replies=type_auto_replies,
        type_triggers=type_triggers,
        type_commands=type_commands,
        event_types=event_types_list,
        sort_dir=sort,
        limit=limit,
        offset=offset,
    )

    results = []
    for item in items:
        data = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        data['is_new'] = (item.status == EventStatus.NEW)
        results.append(data)

    return InboxListResponse(
        items=results,
        total=total,
        has_more=(offset + limit) < total,
    )


@router.post("/bulk-action")
async def bulk_inbox_action(
    request: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    action_service: InboxActionService = Depends(get_inbox_action_service),
):
    """Execute bulk actions (read, delete, ignore, block) over selection or all notifications."""
    affected = await action_service.execute_bulk_action(
        owner_id=current_user.id,
        event_ids=request.event_ids,
        action=request.action,
        apply_to_all=request.apply_to_all,
    )
    return {"status": "success", "affected_rows": affected}


@router.post("/{event_id}/action", response_model=SpecificActionResult)
async def execute_specific_action(
    event_id: int,
    request: SpecificActionRequest,
    current_user: User = Depends(get_current_user),
    action_service: InboxActionService = Depends(get_inbox_action_service),
):
    """
    Execute specific action on an inbox event.

    action_type values:
      mark_resolved   - mark as processed
      reply           - return bot_id/tg_user_id/chat_id for Direct
      accept          - accept join request
      reject          - reject join request
      unban           - unban user in channel
      block           - block (channel or DirectChat) + notification event
      delete_message  - delete triggering message
      delete_and_block - delete message + block user
      change_ban      - change ban (payload: ban_type, duration_seconds, everywhere)
    """
    event = await action_service.get_event(event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await action_service.execute_specific_action(
        event=event,
        action_type=request.action_type,
        payload=request.payload,
    )

    if result is None:
        raise HTTPException(status_code=400, detail=f"Failed to execute action {request.action_type}")

    return result
