"""Обновление режима автоодобрения заявок и критериев."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.bots.auto_approval import AutoApprovalUpdate
from backend.services.bot.features.crud.lookup import find_bot_or_404


class UpdateAutoApproval:
    """Меняет auto_approval_mode и approval_criteria бота."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, data: AutoApprovalUpdate, owner_id: Optional[int] = None,
    ) -> BotModel:
        bot = await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        bot.auto_approval_mode = data.auto_approval_mode
        bot.approval_criteria = data.approval_criteria
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(bot)
        return bot
