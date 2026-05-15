from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.inbox.events import SpecificActionRequest, SpecificActionResult
from backend.services.inbox.features.actions.execute_specific_action import ExecuteSpecificAction
from backend.services.inbox.features.lookup import find_event_or_404

router = APIRouter()


@router.post(
    "/{event_id}/action",
    response_model=SpecificActionResult,
    summary="Точечное действие над одним событием",
    description=(
        "Действия: `mark_resolved` / `ignore` / `reply` (только статусы — без TG), "
        "`accept` / `reject` (заявки на вступление), `block` / `unblock` (бан в канале), "
        "`delete_message` / `delete_and_block`, `change_ban` (поменять длительность бана). "
        "Использует токен бота из события. 404 если событие чужое или бот не найден, "
        "400 для неизвестного action_type, 500 на ошибки Telegram."
    ),
)
async def execute_specific_action(
    event_id: int,
    request: SpecificActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await find_event_or_404(db, event_id, current_user.id)
    return await ExecuteSpecificAction(db).execute(
        event=event,
        action_type=request.action_type,
        payload=request.payload,
    )
