"""Список повторяющихся сообщений готовых к отправке (для celery-таски)."""

from datetime import datetime, timezone
from typing import List

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage


async def get_pending_recurring(
    db: AsyncSession, limit: int = 50,
) -> List[RecurringMessage]:
    """Активные сообщения с next_send_at <= now, попадающие в окно start_date/end_date."""
    now = datetime.now(timezone.utc)
    rows = (await db.execute(
        select(RecurringMessage)
        .where(
            and_(
                RecurringMessage.is_active == True,
                RecurringMessage.next_send_at <= now,
                or_(RecurringMessage.start_date.is_(None), RecurringMessage.start_date <= now),
                or_(RecurringMessage.end_date.is_(None), RecurringMessage.end_date >= now),
            )
        )
        .limit(limit)
    )).scalars().all()
    return list(rows)
