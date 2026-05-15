import logging

from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval

logger = logging.getLogger(__name__)


class ApprovePendingJoinRequest:
    """approve_chat_join_request в TG + помечает PendingApproval handled."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, bot, pending_id: int) -> PendingApproval | None:
        result = await self.db.execute(
            select(PendingApproval).where(PendingApproval.id == pending_id)
        )
        pending = result.scalar_one_or_none()
        if not pending:
            logger.warning("PendingApproval %s not found", pending_id)
            return None

        try:
            await bot.approve_chat_join_request(
                chat_id=pending.chat_id,
                user_id=pending.user_id,
            )
            return pending
        except TelegramAPIError as exc:
            logger.warning(
                "Failed to approve join request for user %s: %s",
                pending.user_id,
                exc,
            )
            return None
