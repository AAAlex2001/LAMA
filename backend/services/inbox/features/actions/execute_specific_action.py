"""Диспатчер action_type для одного события инбокса."""

import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot
from backend.models.inbox import InboxEvent
from backend.schemas.inbox.events import SpecificActionResult
from backend.services.bot_provider import resolve_by_token
from backend.services.inbox.features.actions.block_user import block_user
from backend.services.inbox.features.actions.change_ban import change_ban
from backend.services.inbox.features.actions.delete_and_block import delete_and_block
from backend.services.inbox.features.actions.delete_message import delete_message
from backend.services.inbox.features.actions.handle_join_request import (
    accept_join_request,
    reject_join_request,
)
from backend.services.inbox.features.actions.status_actions import (
    ignore_event,
    mark_resolved,
    reply,
)
from backend.services.inbox.features.actions.unban_user import unban_user

logger = logging.getLogger(__name__)


class ExecuteSpecificAction:
    """Маршрутизирует action_type → конкретный обработчик."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        event: InboxEvent,
        action_type: str,
        payload: Optional[dict] = None,
    ) -> SpecificActionResult:
        payload = payload or {}

        if action_type == "mark_resolved":
            return await mark_resolved(self.db, event)
        if action_type == "ignore":
            return await ignore_event(self.db, event)
        if action_type == "reply":
            return await reply(self.db, event)

        client = await resolve_event_client(self.db, event, action_type)

        try:
            return await dispatch_telegram_action(self.db, event, client, action_type, payload)
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                "Ошибка при выполнении %s для события %s: %s",
                action_type, event.id, exc, exc_info=True,
            )
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка Telegram при выполнении {action_type}: {exc}",
            )


async def resolve_event_client(db: AsyncSession, event: InboxEvent, action_type: str):
    """Достаёт TG-клиента бота события; 404 если бот не найден."""
    bot = await db.get(Bot, event.bot_id) if event.bot_id else None
    if not bot:
        logger.warning("Не удалось выполнить %s для события %s: бот не найден.", action_type, event.id)
        raise HTTPException(status_code=404, detail="Event not found")
    return resolve_by_token(bot.token)


async def dispatch_telegram_action(
    db: AsyncSession,
    event: InboxEvent,
    client,
    action_type: str,
    payload: dict,
) -> SpecificActionResult:
    """Маршрут к конкретному действию, требующему вызова Telegram."""
    if action_type == "accept":
        return await accept_join_request(db, event, client)
    if action_type == "reject":
        return await reject_join_request(db, event, client)
    if action_type == "unban":
        return await unban_user(db, event, client)
    if action_type == "block":
        return await block_user(db, event, client)
    if action_type == "delete_message":
        return await delete_message(db, event, client)
    if action_type == "delete_and_block":
        return await delete_and_block(db, event, client)
    if action_type == "change_ban":
        return await change_ban(db, event, client, payload)

    logger.warning("Неизвестный action_type '%s' для события %s.", action_type, event.id)
    raise HTTPException(status_code=400, detail=f"Unknown action_type: {action_type}")
