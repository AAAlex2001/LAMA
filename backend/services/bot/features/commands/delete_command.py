"""Удаление BotCommand."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot.features.commands.lookup import find_command_or_404


class DeleteCommand:
    """Удаляет команду; 404 если не найдена."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        command_id: int,
        owner_id: Optional[int] = None,
        bot_id: Optional[int] = None,
    ) -> None:
        command = await find_command_or_404(
            self.db, command_id, owner_id=owner_id, bot_id=bot_id
        )
        await self.db.delete(command)
        await self.db.flush()
