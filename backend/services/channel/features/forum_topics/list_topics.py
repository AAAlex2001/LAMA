from typing import List

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ForumTopic
from backend.schemas.channels.forum_topics import ForumTopicResponse
from backend.services.channel.utils.query_utils import get_channel


async def ensure_general_topic(db: AsyncSession, channel_id: int) -> ForumTopic:
    """Атомарно создаёт General-тему (thread_id=1) канала или возвращает существующую.

    ``INSERT ... ON CONFLICT (channel_id, thread_id) DO NOTHING`` исключает race condition.
    """
    statement = pg_insert(ForumTopic).values(
        channel_id=channel_id,
        thread_id=1,
        name="Общий",
    ).on_conflict_do_nothing(index_elements=["channel_id", "thread_id"]).returning(ForumTopic)

    inserted = (await db.execute(statement)).scalar_one_or_none()
    if inserted is not None:
        await db.flush()
        return inserted

    return (await db.execute(
        select(ForumTopic).where(
            ForumTopic.channel_id == channel_id,
            ForumTopic.thread_id == 1,
        )
    )).scalar_one()


class ListChannelTopics:
    """Возвращает список тем форума канала (или пустой список если канал не форум)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, owner_id: int) -> List[ForumTopicResponse]:
        """Возвращает темы. 404 если канал не принадлежит пользователю."""
        channel = await get_channel(self.db, channel_id, owner_id=owner_id)
        if channel is None:
            raise HTTPException(status_code=404, detail="Канал не найден")
        if not channel.is_forum:
            return []

        await ensure_general_topic(self.db, channel_id)

        topics = (await self.db.execute(
            select(ForumTopic)
            .where(ForumTopic.channel_id == channel_id)
            .order_by(ForumTopic.thread_id)
        )).scalars().all()

        return [ForumTopicResponse.model_validate(topic) for topic in topics]
