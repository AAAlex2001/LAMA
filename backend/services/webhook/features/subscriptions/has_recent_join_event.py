import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventType

logger = logging.getLogger(__name__)


class HasRecentJoinEvent:
    async def execute(
        self,
        db: AsyncSession,
        user_id: int,
        channel_id: int | None,
    ) -> bool:
        if not channel_id:
            return False

        try:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=2)
            result = await db.execute(
                select(InboxEvent.id)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                    InboxEvent.created_at >= cutoff,
                )
                .limit(1)
            )
            return result.scalar_one_or_none() is not None
        except Exception as exc:
            logger.error("has recent join event failed: %s", exc)
            return False
