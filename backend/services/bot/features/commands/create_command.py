"""Создание BotCommand с валидацией по action_type."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotCommand
from backend.services.bot.features.commands.helpers import (
    ensure_command_unique,
    require_response_text,
    resolve_claim_fields,
)
from backend.services.bot.features.crud.lookup import find_bot_or_404


class CreateCommand:
    """Создаёт команду; валидирует уникальность и поля по action_type."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, data, owner_id: Optional[int] = None,
    ) -> BotCommand:
        await find_bot_or_404(self.db, bot_id, owner_id=owner_id)

        channel_id = getattr(data, "channel_id", None)
        await ensure_command_unique(self.db, bot_id, data.command, channel_id)

        action_type = getattr(data, "action_type", None) or "MESSAGE"

        if action_type == "CLAIM_ADMIN":
            claim_target, claim_channel_ids = resolve_claim_fields(
                getattr(data, "claim_target", None),
                getattr(data, "claim_channel_ids", None),
            )
            response_text = (str(data.response_text).strip()
                             if getattr(data, "response_text", None) is not None
                             else " ")
            command = BotCommand(
                bot_id=bot_id,
                channel_id=channel_id,
                command=data.command,
                description=data.description,
                response_text=response_text,
                response_media_url=None,
                response_media_urls=None,
                response_media_type=None,
                response_buttons=None,
                scope=getattr(data, "scope", None),
                is_active=data.is_active,
                action_type=action_type,
                claim_target=claim_target,
                claim_channel_ids=claim_channel_ids,
            )
        else:
            command = BotCommand(
                bot_id=bot_id,
                channel_id=channel_id,
                command=data.command,
                description=data.description,
                response_text=require_response_text(getattr(data, "response_text", None)),
                response_media_url=data.response_media_url,
                response_media_urls=data.response_media_urls,
                response_media_type=data.response_media_type,
                response_buttons=data.response_buttons,
                scope=getattr(data, "scope", None),
                is_active=data.is_active,
                action_type=action_type,
                claim_target=None,
                claim_channel_ids=None,
            )

        self.db.add(command)
        await self.db.flush()
        await self.db.refresh(command)
        return command
