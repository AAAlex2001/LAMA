"""Создание RecurringMessage."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage
from backend.schemas.bots import RecurringMessageCreate
from backend.services.bot.features.crud.lookup import find_bot_or_404
from backend.services.bot.features.recurring.schedule_calculator import calculate_next_send


class CreateRecurring:
    """Создаёт повторяющееся сообщение и сразу рассчитывает next_send_at."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, data: RecurringMessageCreate, owner_id: int,
    ) -> RecurringMessage:
        await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        msg = RecurringMessage(
            bot_id=bot_id,
            name=data.name,
            text_content=data.text_content,
            media_url=data.media_url,
            media_type=data.media_type,
            inline_buttons=data.inline_buttons,
            target_chats=data.target_chats,
            interval_type=data.interval_type,
            interval_value=data.interval_value,
            time_points=data.time_points,
            timezone=data.timezone,
            start_date=data.start_date,
            end_date=data.end_date,
            weekdays=data.weekdays,
            is_active=data.is_active,
        )
        msg.next_send_at = calculate_next_send(msg)

        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg
