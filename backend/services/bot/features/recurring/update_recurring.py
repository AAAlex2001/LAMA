"""Обновление RecurringMessage с пересчётом next_send_at."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage
from backend.schemas.bots import RecurringMessageUpdate
from backend.services.bot.features.recurring.lookup import find_recurring_or_404
from backend.services.bot.features.recurring.schedule_calculator import calculate_next_send


class UpdateRecurring:
    """Применяет переданные поля и пересчитывает next_send_at."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, message_id: int, data: RecurringMessageUpdate, owner_id: int,
    ) -> RecurringMessage:
        msg = await find_recurring_or_404(self.db, message_id, owner_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(msg, field, value)

        msg.next_send_at = calculate_next_send(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg
