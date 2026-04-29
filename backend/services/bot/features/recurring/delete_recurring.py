"""Удаление RecurringMessage."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.recurring.lookup import find_recurring_or_404


class DeleteRecurring:
    """Удаляет повторяющееся сообщение пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, message_id: int, owner_id: int) -> None:
        msg = await find_recurring_or_404(self.db, message_id, owner_id)
        await self.db.delete(msg)
        await self.db.flush()
