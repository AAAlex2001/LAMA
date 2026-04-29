"""Auto-reply frequency limiter check."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReply, AutoReplyLog


async def is_allowed_by_frequency(
    db: AsyncSession, reply: AutoReply, chat_id: int, user_id: Optional[int],
) -> bool:
    """True when no recent trigger exists for reply frequency target."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=reply.frequency_limit_minutes)
    query = select(func.count()).select_from(AutoReplyLog).where(
        AutoReplyLog.auto_reply_id == reply.id,
        AutoReplyLog.triggered_at >= cutoff,
    )
    if reply.frequency_limit_type == "per_user" and user_id is not None:
        query = query.where(AutoReplyLog.user_id == user_id)
    else:
        query = query.where(AutoReplyLog.chat_id == chat_id)
    return ((await db.execute(query)).scalar() or 0) == 0