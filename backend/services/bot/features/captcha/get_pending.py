"""Lookup active pending captcha approval."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval


async def get_pending_approval(
    db: AsyncSession, bot_id: int, user_id: int,
) -> Optional[PendingApproval]:
    """Return active pending approval for bot/user, if any."""
    result = await db.execute(
        select(PendingApproval).where(
            PendingApproval.bot_id == bot_id,
            PendingApproval.user_id == user_id,
            PendingApproval.is_approved == False,
            PendingApproval.is_rejected == False,
        )
    )
    return result.scalars().first()