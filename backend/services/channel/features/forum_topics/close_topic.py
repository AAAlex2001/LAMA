from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ForumTopic


class CloseForumTopic:
    """Помечает тему форума канала как закрытую."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, thread_id: int) -> None:
        """Делает ничего, если тема не существует."""
        topic = (await self.db.execute(
            select(ForumTopic).where(
                ForumTopic.channel_id == channel_id,
                ForumTopic.thread_id == thread_id,
            )
        )).scalar_one_or_none()

        if topic is None:
            return

        topic.is_closed = True
        await self.db.flush()
