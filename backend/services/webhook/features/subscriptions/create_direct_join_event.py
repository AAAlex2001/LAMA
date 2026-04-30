import logging

from aiogram.types import ChatMemberUpdated, User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ChatInviteLink
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent

logger = logging.getLogger(__name__)


class CreateDirectJoinEvent:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        chat_member: ChatMemberUpdated,
        member: User,
        link_url: str | None,
    ) -> None:
        try:
            channel = await get_channel_by_telegram_id(
                self.db,
                chat_member.chat.id,
                bot_id=self.bot_model.id,
            )
            link_id = None
            link_name = None
            if link_url:
                db_link = await self.get_invite_link(link_url)
                if db_link:
                    link_id = db_link.id
                    link_name = db_link.name

            await CreateInboxEvent(self.db).execute(
                InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.MODERATION,
                    entity_type=EntityType.CHANNEL,
                    event_type=EventType.CHANNEL_JOIN_REQUEST,
                    bot_id=self.bot_model.id,
                    channel_id=channel.id if channel else None,
                    tg_user_id=member.id,
                    tg_username=member.username,
                    status=EventStatus.PROCESSED,
                    description=f"@{member.username or member.id} вступил в {chat_member.chat.title}",
                    payload={
                        "join_state": "accepted",
                        "requires_approval": False,
                        "link_id": link_id,
                        "link_name": link_name,
                        "link_url": link_url,
                        "chat_title": chat_member.chat.title,
                        "first_name": member.first_name,
                    },
                )
            )
        except Exception as exc:
            logger.error("Failed to create direct join inbox event: %s", exc, exc_info=True)

    async def get_invite_link(self, link_url: str) -> ChatInviteLink | None:
        result = await self.db.execute(
            select(ChatInviteLink).where(ChatInviteLink.invite_link == link_url)
        )
        return result.scalar_one_or_none()
