from typing import Optional

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ForumTopic


class UpsertForumTopic:
    """Атомарно создаёт или обновляет тему форума канала по (channel_id, thread_id)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        thread_id: int,
        name: str,
        icon_color: Optional[int] = None,
        icon_custom_emoji_id: Optional[str] = None,
    ) -> ForumTopic:
        """Возвращает созданную или обновлённую тему. Race-safe через ON CONFLICT DO UPDATE."""
        update_payload = {"name": name}
        if icon_color is not None:
            update_payload["icon_color"] = icon_color
        if icon_custom_emoji_id is not None:
            update_payload["icon_custom_emoji_id"] = icon_custom_emoji_id

        statement = pg_insert(ForumTopic).values(
            channel_id=channel_id,
            thread_id=thread_id,
            name=name,
            icon_color=icon_color,
            icon_custom_emoji_id=icon_custom_emoji_id,
        ).on_conflict_do_update(
            index_elements=["channel_id", "thread_id"],
            set_=update_payload,
        ).returning(ForumTopic)

        result = await self.db.execute(statement)
        await self.db.flush()
        return result.scalar_one()
