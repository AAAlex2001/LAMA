import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventStatus, EventType

logger = logging.getLogger(__name__)


class MarkJoinRequestAccepted:
    """Помечает join-event как accepted в payload + status=PROCESSED."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, user_id: int, chat_id: int) -> None:
        try:
            channel_id = await self.get_channel_id(chat_id)
            if not channel_id:
                return

            result = await self.db.execute(
                select(InboxEvent)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                )
                .order_by(InboxEvent.id.desc())
                .limit(1)
            )
            event = result.scalar_one_or_none()
            if not event:
                return

            payload = dict(event.payload or {})
            payload["join_state"] = "accepted"
            event.payload = payload
            event.status = EventStatus.PROCESSED
            await self.db.flush()
        except Exception as exc:
            logger.error("mark join event accepted failed: %s", exc)

    async def get_channel_id(self, chat_id: int) -> int | None:
        result = await self.db.execute(
            select(ChannelGroup.id).where(ChannelGroup.telegram_id == chat_id)
        )
        return result.scalar_one_or_none()
