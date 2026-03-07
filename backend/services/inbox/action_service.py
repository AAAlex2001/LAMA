import logging
from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.inbox import InboxEvent
from backend.models.bots import Bot
from backend.models.channels import ChannelGroup
from backend.schemas.inbox.enums import EventStatus, BulkActionType
from backend.services.webhook.base import get_bot_session

logger = logging.getLogger(__name__)

class InboxActionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_bulk_action(
        self,
        owner_id: int,
        event_ids: List[int],
        action: BulkActionType,
        apply_to_all: bool = False
    ) -> int:
        """Execute a bulk action on inbox events, returning rows affected."""
        base_where = InboxEvent.owner_id == owner_id
        if not apply_to_all:
            if not event_ids:
                return 0
            base_where = base_where & InboxEvent.id.in_(event_ids)

        modified_count = 0

        if action == BulkActionType.READ:
            stmt = update(InboxEvent).where(base_where).values(status=EventStatus.PROCESSED)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount

        elif action == BulkActionType.IGNORE:
            stmt = update(InboxEvent).where(base_where).values(status=EventStatus.IGNORED)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount

        elif action == BulkActionType.DELETE:
            stmt = delete(InboxEvent).where(base_where)
            res = await self.db.execute(stmt)
            modified_count = res.rowcount

        elif action in [BulkActionType.BLOCK, BulkActionType.UNBLOCK]:
            query = select(InboxEvent).where(base_where)
            result = await self.db.execute(query)
            events = result.scalars().all()

            for event in events:
                if not (event.tg_user_id and event.bot_id and event.channel_id):
                    continue

                bot = await self.db.get(Bot, event.bot_id)
                channel = await self.db.get(ChannelGroup, event.channel_id)

                if not (bot and channel and channel.telegram_id):
                    continue

                try:
                    async with get_bot_session(bot.token) as client:
                        if action == BulkActionType.BLOCK:
                            await client.ban_chat_member(channel.telegram_id, event.tg_user_id)
                        else:
                            await client.unban_chat_member(channel.telegram_id, event.tg_user_id)

                    event.status = EventStatus.PROCESSED
                    modified_count += 1
                except Exception as e:
                    logger.error(f"Failed to {action.value} user {event.tg_user_id} in channel {channel.telegram_id}: {str(e)}", exc_info=True)

        await self.db.commit()
        return modified_count

    async def create_event(self, event_data: dict) -> InboxEvent:
        """Internal method to create an inbox event from other services (webhooks, etc)"""
        event = InboxEvent(**event_data)
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_event(self, event_id: int, owner_id: int) -> Optional[InboxEvent]:
        result = await self.db.execute(
            select(InboxEvent).where(InboxEvent.id == event_id, InboxEvent.owner_id == owner_id)
        )
        return result.scalar_one_or_none()

    async def execute_specific_action(self, event: InboxEvent, action_type: str, payload: dict = None) -> bool:
        """Execute a specific action on an inbox event (accept, reject, reply, etc)"""
        bot = await self.db.get(Bot, event.bot_id) if event.bot_id else None
        channel = await self.db.get(ChannelGroup, event.channel_id) if event.channel_id else None

        if not bot or not channel or not channel.telegram_id:
            logger.warning(f"Cannot execute {action_type} for event {event.id}: missing bot/channel details.")
            return False

        try:
            async with get_bot_session(bot.token) as client:
                if action_type == "accept":
                    success = await client.approve_chat_join_request(channel.telegram_id, event.tg_user_id)
                elif action_type == "reject":
                    success = await client.decline_chat_join_request(channel.telegram_id, event.tg_user_id)
                else:
                    logger.warning(f"Unknown action_type {action_type} for inbox event {event.id}.")
                    return False

            if success:
                event.status = EventStatus.PROCESSED
                await self.db.commit()

            return success
        except Exception as e:
            logger.error(f"Failed to execute {action_type} for event {event.id}: {str(e)}", exc_info=True)
            return False
