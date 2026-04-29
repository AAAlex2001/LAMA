"""Auto-reply trigger logging."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReplyLog


async def log_trigger(
    db: AsyncSession, auto_reply_id: int, chat_id: int, user_id: Optional[int],
) -> None:
    """Persist AutoReplyLog row for frequency limiting."""
    db.add(AutoReplyLog(auto_reply_id=auto_reply_id, chat_id=chat_id, user_id=user_id))
    await db.flush()