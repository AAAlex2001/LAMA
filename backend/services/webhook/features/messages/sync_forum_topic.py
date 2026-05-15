import logging

from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.models.channels import ForumTopic
from backend.services.channel.features.forum_topics import (
    CloseForumTopic,
    ReopenForumTopic,
    UpsertForumTopic,
)
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id

logger = logging.getLogger(__name__)


class SyncForumTopic:
    """Создаёт/обновляет ForumTopic по message_thread_id."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, message: Message) -> None:
        chat_type = message.chat.type if message.chat else None
        if chat_type not in ("group", "supergroup"):
            return

        has_event = any([
            message.forum_topic_created,
            message.forum_topic_edited,
            message.forum_topic_closed,
            message.forum_topic_reopened,
        ])
        if not has_event and not message.message_thread_id:
            return

        channel = await get_channel_by_telegram_id(
            self.db, message.chat.id, bot_id=self.bot_model.id,
        )
        if not channel or not channel.is_forum:
            return

        try:
            if message.forum_topic_created:
                await UpsertForumTopic(self.db).execute(
                    channel_id=channel.id,
                    thread_id=message.message_thread_id or 0,
                    name=message.forum_topic_created.name,
                    icon_color=message.forum_topic_created.icon_color,
                    icon_custom_emoji_id=message.forum_topic_created.icon_custom_emoji_id,
                )
                return

            if message.forum_topic_edited and message.forum_topic_edited.name:
                await UpsertForumTopic(self.db).execute(
                    channel_id=channel.id,
                    thread_id=message.message_thread_id or 0,
                    name=message.forum_topic_edited.name,
                    icon_custom_emoji_id=message.forum_topic_edited.icon_custom_emoji_id,
                )
                return

            if message.forum_topic_closed:
                await CloseForumTopic(self.db).execute(channel.id, message.message_thread_id or 0)
                return

            if message.forum_topic_reopened:
                await ReopenForumTopic(self.db).execute(channel.id, message.message_thread_id or 0)
                return

            await self.create_unknown_topic_if_needed(message, channel.id)
        except Exception as exc:
            logger.error("Forum topic event error: %s", exc, exc_info=True)

    async def create_unknown_topic_if_needed(self, message: Message, channel_id: int) -> None:
        if not message.message_thread_id or message.message_thread_id == 1:
            return

        existing = (await self.db.execute(
            select(ForumTopic).where(ForumTopic.channel_id == channel_id)
        )).scalars().all()
        known_ids = {topic.thread_id for topic in existing}
        if message.message_thread_id in known_ids:
            return

        topic_name = f"Топик #{message.message_thread_id}"
        if message.reply_to_message and message.reply_to_message.forum_topic_created:
            topic_name = message.reply_to_message.forum_topic_created.name

        await UpsertForumTopic(self.db).execute(
            channel_id=channel_id,
            thread_id=message.message_thread_id,
            name=topic_name,
        )
