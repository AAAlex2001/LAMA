"""Запуск триггера JOIN_REQUEST_APPROVED/REJECTED после действий администратора."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot, TriggerType
from backend.models.channels import ChannelGroup
from backend.models.inbox import InboxEvent
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent
from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


async def fire_join_trigger(
    db: AsyncSession,
    bot: Bot,
    trigger_type: TriggerType,
    event: InboxEvent,
    channel: ChannelGroup,
) -> None:
    """Триггер с контекстом из event.payload; ошибки глушит (не блокирует основное действие)."""
    try:
        telegram_bot = resolve_by_token(bot.token)
        await FireTriggerEvent(db).execute(
            bot_id=bot.id,
            trigger_type=trigger_type,
            user_id=event.tg_user_id,
            chat_id=channel.telegram_id,
            telegram_bot=telegram_bot,
            chat_type="supergroup",
            context=build_trigger_context(event),
        )
    except Exception as exc:
        logger.error("fire_join_trigger failed: %s", exc)


def build_trigger_context(event: InboxEvent) -> dict:
    """Контекст для триггера: имя/чат из payload + флаг admin_action."""
    payload = event.payload or {}
    return {
        "username": event.tg_username,
        "first_name": payload.get("first_name"),
        "chat_title": payload.get("chat_title"),
        "admin_action": True,
    }
