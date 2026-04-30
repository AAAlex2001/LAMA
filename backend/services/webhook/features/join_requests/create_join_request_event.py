import logging

from aiogram.types import ChatJoinRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChatInviteLink
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


class CreateJoinRequestEvent:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        join_request: ChatJoinRequest,
        status: EventStatus = EventStatus.NEW,
        join_state: str = "pending",
    ) -> None:
        try:
            channel = await get_channel_by_telegram_id(
                self.db,
                join_request.chat.id,
                bot_id=self.bot_model.id,
            )
            invite_link = getattr(join_request, "invite_link", None)
            link_url = invite_link.invite_link if invite_link else None
            link_id = None
            link_name = None
            requires_approval = True

            if link_url:
                db_link = await self.get_invite_link(link_url)
                if db_link:
                    link_id = db_link.id
                    link_name = db_link.name
                    requires_approval = db_link.creates_join_request

            await CreateInboxEvent(self.db).execute(
                InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.MODERATION,
                    entity_type=EntityType.CHANNEL,
                    event_type=EventType.CHANNEL_JOIN_REQUEST,
                    bot_id=self.bot_model.id,
                    channel_id=channel.id if channel else None,
                    tg_user_id=join_request.from_user.id,
                    tg_username=join_request.from_user.username,
                    status=status,
                    description=(
                        f"Заявка от @{join_request.from_user.username or join_request.from_user.id} "
                        f"на вступление в {join_request.chat.title}"
                    ),
                    payload={
                        "join_state": join_state,
                        "requires_approval": requires_approval,
                        "link_id": link_id,
                        "link_name": link_name,
                        "link_url": link_url,
                        "chat_title": join_request.chat.title,
                        "first_name": join_request.from_user.first_name,
                    },
                )
            )
        except Exception as exc:
            logger.error(
                "Failed to create join_request inbox event: %s",
                exc,
                exc_info=True,
            )

    async def get_invite_link(self, link_url: str) -> ChatInviteLink | None:
        result = await self.db.execute(
            select(ChatInviteLink).where(ChatInviteLink.invite_link == link_url)
        )
        return result.scalar_one_or_none()
