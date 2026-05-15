import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.enums import EventType

logger = logging.getLogger(__name__)


class FindInviteLinkFromInbox:
    """Ищет invite-ссылку из последнего join-event в инбоксе."""

    async def execute(
        self,
        db: AsyncSession,
        user_id: int,
        telegram_chat_id: int,
    ) -> str | None:
        try:
            channel_result = await db.execute(
                select(ChannelGroup.id).where(
                    ChannelGroup.telegram_id == telegram_chat_id
                )
            )
            channel_id = channel_result.scalar_one_or_none()
            if not channel_id:
                return None

            event_result = await db.execute(
                select(InboxEvent)
                .where(
                    InboxEvent.tg_user_id == user_id,
                    InboxEvent.channel_id == channel_id,
                    InboxEvent.event_type == EventType.CHANNEL_JOIN_REQUEST,
                )
                .order_by(InboxEvent.id.desc())
                .limit(1)
            )
            event = event_result.scalar_one_or_none()
            if event and event.payload:
                return event.payload.get("link_url")
        except Exception as exc:
            logger.error("find invite link from inbox failed: %s", exc)
        return None
