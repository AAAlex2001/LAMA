"""Обновление полей AutoReply (exclude_unset)."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReply
from backend.services.bot.features.auto_replies.lookup import find_auto_reply_or_404


class UpdateAutoReply:
    """Применяет только переданные поля; обновляет updated_at."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, auto_reply_id: int, data, owner_id: Optional[int] = None,
    ) -> AutoReply:
        auto_reply = await find_auto_reply_or_404(self.db, auto_reply_id, owner_id=owner_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(auto_reply, field, value)

        auto_reply.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(auto_reply)
        return auto_reply
