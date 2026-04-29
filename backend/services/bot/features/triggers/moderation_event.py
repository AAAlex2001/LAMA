"""Create inbox event for trigger moderation actions."""

from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Trigger, TriggerActionType
from backend.schemas.inbox.enums import EntityType, EventStatus, EventType, InboxCategory
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent


async def create_trigger_moderation_event(
    db: AsyncSession,
    trigger: Trigger,
    user_id: int,
    chat_id: int,
    context: Optional[Dict[str, Any]],
) -> None:
    """Create CHANNEL_BAN event when a moderation trigger action succeeds."""
    channel = await get_channel_by_telegram_id(db, chat_id, bot_id=trigger.bot_id)
    if not channel:
        return

    context_data = context if isinstance(context, dict) else {}
    trigger_name = trigger.name.strip()
    username = normalize_username(context_data.get("username"))
    message_text = extract_message_text(context_data)
    message_id = context_data.get("message_id") if isinstance(context_data.get("message_id"), int) else None
    action_data = trigger.action_data if isinstance(trigger.action_data, dict) else {}
    duration_minutes = action_data.get("duration_minutes") if isinstance(action_data.get("duration_minutes"), int) else None
    reason = f'Триггер "{trigger_name}" выполнил {moderation_action_description(trigger.action_type)}'
    target_name = f"@{username}" if username else str(user_id)
    description = f"{reason} для {target_name}"
    if message_text:
        description = f"{description}: {message_text}"

    await CreateInboxEvent(db).execute(InboxEventCreate(
        owner_id=channel.owner_id,
        category=InboxCategory.SYSTEM,
        entity_type=EntityType.CHANNEL,
        event_type=EventType.CHANNEL_BAN,
        bot_id=trigger.bot_id,
        channel_id=channel.id,
        tg_user_id=user_id,
        tg_username=username,
        status=EventStatus.NEW,
        description=description,
        payload=build_payload(
            trigger=trigger,
            trigger_name=trigger_name,
            chat_id=chat_id,
            message_id=message_id,
            message_text=message_text,
            duration_minutes=duration_minutes,
            reason=reason,
            context_data=context_data,
        ),
    ))


def normalize_username(value) -> Optional[str]:
    """Normalize username from trigger context."""
    if value is None:
        return None
    username = str(value).strip()
    return username or None


def extract_message_text(context_data: dict) -> Optional[str]:
    """Extract message text/command from context and clamp for payload."""
    for key in ("message_text", "text", "command"):
        value = context_data.get(key)
        if isinstance(value, str) and value.strip():
            text = value.strip()
            return f"{text[:497]}..." if len(text) > 500 else text
    return None


def moderation_action_description(action_type: TriggerActionType) -> str:
    """Human-readable action description for inbox text."""
    return {
        TriggerActionType.MUTE_USER: "мут",
        TriggerActionType.BAN_USER: "бан",
        TriggerActionType.UNBAN_USER: "разбан",
        TriggerActionType.REMOVE_FROM_GROUP: "удаление из группы",
    }.get(action_type, action_type.value)


def ban_type_for_action(action_type: TriggerActionType) -> str:
    """Map trigger moderation action to inbox ban_type."""
    if action_type == TriggerActionType.MUTE_USER:
        return "mute"
    if action_type == TriggerActionType.REMOVE_FROM_GROUP:
        return "kick"
    return "ban"


def build_payload(
    trigger: Trigger,
    trigger_name: str,
    chat_id: int,
    message_id: Optional[int],
    message_text: Optional[str],
    duration_minutes: Optional[int],
    reason: str,
    context_data: dict,
) -> dict:
    """Build inbox payload for trigger moderation event."""
    payload = {
        "ban_type": ban_type_for_action(trigger.action_type),
        "is_unbanned": trigger.action_type == TriggerActionType.UNBAN_USER,
        "duration_minutes": duration_minutes,
        "chat_id": chat_id,
        "message_id": message_id,
        "message_text": message_text,
        "block_reason": reason,
        "reason": reason,
        "reason_source": "trigger",
        "action": trigger.action_type.value,
        "automatic": True,
        "trigger_id": trigger.id,
        "trigger_names": [trigger_name],
    }
    command = context_data.get("command")
    if isinstance(command, str) and command.strip():
        payload["command"] = command.strip()
    return payload