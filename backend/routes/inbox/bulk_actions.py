from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.inbox.events import BulkActionRequest
from backend.services.inbox.features.execute_bulk_action import ExecuteBulkAction

router = APIRouter()


@router.post(
    "/bulk-action",
    summary="Массовое действие над событиями",
    description=(
        "Применяет action ко всем `event_ids` (или ко всем событиям юзера если "
        "`apply_to_all=True`). Поддерживаемые actions: READ / IGNORE / DELETE / "
        "BLOCK / UNBLOCK. Для BLOCK/UNBLOCK дёргает Telegram bot.ban/unban_chat_member, "
        "ошибки TG логируются но не пробрасываются. "
        "Возвращает `{status, affected_rows}`."
    ),
)
async def bulk_inbox_action(
    request: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    affected = await ExecuteBulkAction(db).execute(
        owner_id=current_user.id,
        event_ids=request.event_ids,
        action=request.action,
        apply_to_all=request.apply_to_all,
    )
    return {"status": "success", "affected_rows": affected}
