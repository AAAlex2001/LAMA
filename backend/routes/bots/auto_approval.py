from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.bots.auto_approval import AutoApprovalResponse, AutoApprovalUpdate
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.settings.update_auto_approval import UpdateAutoApproval

router = APIRouter()


def build_auto_approval_response(bot) -> AutoApprovalResponse:
    return AutoApprovalResponse(
        auto_approval_mode=bot.auto_approval_mode,
        approval_criteria=bot.approval_criteria,
    )


@router.get("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)
async def get_auto_approval_settings(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await find_bot_or_404(db, bot_id, owner_id=current_user.id)
    return build_auto_approval_response(bot)


@router.put("/{bot_id}/auto-approval", response_model=AutoApprovalResponse)
async def update_auto_approval_settings(
    bot_id: int,
    data: AutoApprovalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bot = await UpdateAutoApproval(db).execute(bot_id, data, owner_id=current_user.id)
    return build_auto_approval_response(bot)
