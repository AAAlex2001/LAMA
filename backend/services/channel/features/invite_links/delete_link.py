from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChatInviteLink


class DeleteInviteLink:
    """Удаляет пригласительную ссылку из БД (без вызова Telegram API)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, link_id: int, channel_id: int) -> None:
        """Удаляет ссылку. 404 если её нет."""
        result = await self.db.execute(
            delete(ChatInviteLink).where(
                ChatInviteLink.id == link_id,
                ChatInviteLink.channel_id == channel_id,
            )
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Invite link not found")
        await self.db.flush()
