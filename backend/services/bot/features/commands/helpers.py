"""Command helpers: scope filtering, uniqueness, and action-field validation."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotCommand


def require_response_text(response_text: Optional[str]) -> str:
    """Return stripped response text or raise 400 for empty MESSAGE commands."""
    if response_text is None or not str(response_text).strip():
        raise HTTPException(status_code=400, detail="response_text is required for MESSAGE commands")
    return str(response_text).strip()


def resolve_claim_fields(claim_target: Optional[str], claim_channel_ids) -> tuple[str, Optional[list]]:
    """Normalize CLAIM_ADMIN fields and validate channel list for SPECIFIC_CHANNEL."""
    target = claim_target or "SPECIFIC_CHANNEL"
    if target == "SPECIFIC_CHANNEL":
        if not claim_channel_ids:
            raise HTTPException(status_code=400, detail="claim_channel_ids is required for SPECIFIC_CHANNEL")
        return target, list(claim_channel_ids)
    return target, None


def apply_scope_filter(query, chat_type: Optional[str]):
    """Filter BotCommand.scope according to Telegram chat type."""
    if not chat_type:
        return query
    if chat_type == "private":
        return query.where(
            (BotCommand.scope == "PRIVATE")
            | (BotCommand.scope == "ALL")
            | (BotCommand.scope.is_(None))
        )
    if chat_type in ("group", "supergroup"):
        return query.where(
            (BotCommand.scope == "GROUPS")
            | (BotCommand.scope == "ALL")
            | (BotCommand.scope.is_(None))
        )
    return query


async def ensure_command_unique(
    db: AsyncSession, bot_id: int, command_text: str, channel_id: Optional[int],
) -> None:
    """Raise 400 if the command already exists for this bot/channel scope."""
    scope_filter = BotCommand.channel_id.is_(None) if channel_id is None else BotCommand.channel_id == channel_id
    existing = (await db.execute(
        select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == command_text,
            scope_filter,
        )
    )).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Command {command_text} already exists for this bot",
        )