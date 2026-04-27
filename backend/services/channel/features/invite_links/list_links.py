from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink


class ListInviteLinks:
    """Возвращает все пригласительные ссылки канала (новые сначала)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int) -> List[ChatInviteLink]:
        """Возвращает список ссылок канала."""
        rows = (await self.db.execute(
            select(ChatInviteLink)
            .where(ChatInviteLink.channel_id == channel_id)
            .order_by(ChatInviteLink.id.desc())
        )).scalars().all()
        return list(rows)
