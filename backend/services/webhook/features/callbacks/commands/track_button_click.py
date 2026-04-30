from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotCommandButtonClick


class TrackButtonClick:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, command_id: int, button_id: str, user_id: int) -> None:
        stmt = (
            insert(BotCommandButtonClick)
            .values(command_id=command_id, button_id=button_id, user_id=user_id)
            .on_conflict_do_nothing(
                index_elements=["command_id", "button_id", "user_id"]
            )
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def get_count(self, command_id: int, button_id: str) -> int:
        result = await self.db.scalar(
            select(func.count())
            .select_from(BotCommandButtonClick)
            .where(
                BotCommandButtonClick.command_id == command_id,
                BotCommandButtonClick.button_id == button_id,
            )
        )
        return result or 0
