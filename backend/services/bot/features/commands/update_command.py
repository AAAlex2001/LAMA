"""Обновление BotCommand с пере-валидацией по action_type."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotCommand
from backend.services.bot.features.commands.helpers import (
    require_response_text,
    resolve_claim_fields,
)
from backend.services.bot.features.commands.lookup import find_command_or_404


class UpdateCommand:
    """Применяет переданные поля; перевалидирует по action_type."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        command_id: int,
        data,
        owner_id: Optional[int] = None,
        bot_id: Optional[int] = None,
    ) -> BotCommand:
        command = await find_command_or_404(
            self.db, command_id, owner_id=owner_id, bot_id=bot_id
        )

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(command, field, value)

        command.action_type = command.action_type or "MESSAGE"
        normalize_command_for_action_type(command)

        command.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(command)
        return command


def normalize_command_for_action_type(command: BotCommand) -> None:
    """Чистит/проставляет поля в зависимости от action_type. Бросает 400 при невалидной комбинации."""
    if command.action_type == "MESSAGE":
        require_response_text(command.response_text)
        command.claim_target = None
        command.claim_channel_ids = None
        return

    target, channel_ids = resolve_claim_fields(command.claim_target, command.claim_channel_ids)
    command.claim_target = target
    command.claim_channel_ids = channel_ids
