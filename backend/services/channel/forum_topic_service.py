from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ForumTopic
from backend.services.channel.utils.query_utils import get_channel


class ForumTopicService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_channel_topics(self, channel_id: int, owner_id: int) -> list[dict]:
        channel = await get_channel(self.db, channel_id, owner_id=owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Канал не найден")
        if not channel.is_forum:
            return []

        await self.ensure_general_topic(channel_id)
        topics = await self.get_topics(channel_id)
        return [
            {
                "thread_id": t.thread_id,
                "name": t.name,
                "icon_color": t.icon_color,
                "icon_custom_emoji_id": t.icon_custom_emoji_id,
                "is_closed": t.is_closed,
            }
            for t in topics
        ]

    async def get_topics(self, channel_id: int) -> list[ForumTopic]:
        query = (
            select(ForumTopic)
            .where(ForumTopic.channel_id == channel_id)
            .order_by(ForumTopic.thread_id)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def upsert_topic(
        self,
        channel_id: int,
        thread_id: int,
        name: str,
        icon_color: Optional[int] = None,
        icon_custom_emoji_id: Optional[str] = None,
    ) -> ForumTopic:
        query = select(ForumTopic).where(
            ForumTopic.channel_id == channel_id,
            ForumTopic.thread_id == thread_id,
        )
        result = await self.db.execute(query)
        topic = result.scalar_one_or_none()

        if topic:
            topic.name = name
            if icon_color is not None:
                topic.icon_color = icon_color
            if icon_custom_emoji_id is not None:
                topic.icon_custom_emoji_id = icon_custom_emoji_id
        else:
            topic = ForumTopic(
                channel_id=channel_id,
                thread_id=thread_id,
                name=name,
                icon_color=icon_color,
                icon_custom_emoji_id=icon_custom_emoji_id,
            )
            self.db.add(topic)

        await self.db.flush()
        return topic

    async def close_topic(self, channel_id: int, thread_id: int) -> None:
        query = select(ForumTopic).where(
            ForumTopic.channel_id == channel_id,
            ForumTopic.thread_id == thread_id,
        )
        result = await self.db.execute(query)
        topic = result.scalar_one_or_none()
        if topic:
            topic.is_closed = True
            await self.db.flush()

    async def reopen_topic(self, channel_id: int, thread_id: int) -> None:
        query = select(ForumTopic).where(
            ForumTopic.channel_id == channel_id,
            ForumTopic.thread_id == thread_id,
        )
        result = await self.db.execute(query)
        topic = result.scalar_one_or_none()
        if topic:
            topic.is_closed = False
            await self.db.flush()

    async def ensure_general_topic(self, channel_id: int) -> ForumTopic:
        query = select(ForumTopic).where(
            ForumTopic.channel_id == channel_id,
            ForumTopic.thread_id == 1,
        )
        result = await self.db.execute(query)
        topic = result.scalar_one_or_none()
        if not topic:
            topic = ForumTopic(
                channel_id=channel_id,
                thread_id=1,
                name="Общий",
            )
            self.db.add(topic)
            await self.db.flush()
        return topic
