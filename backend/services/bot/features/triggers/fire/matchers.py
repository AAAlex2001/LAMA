"""Trigger chat/filter/delivery-window matchers."""

from datetime import datetime
from typing import Optional

from backend.models.bots import Trigger, TriggerChatType, TriggerType
from backend.services.bot.features.triggers.timezone_resolver import resolve_tz

JOIN_REQUEST_TYPES = (
    TriggerType.JOIN_REQUEST_CREATED,
    TriggerType.JOIN_REQUEST_APPROVED,
    TriggerType.JOIN_REQUEST_REJECTED,
    TriggerType.CAPTCHA_PASSED,
    TriggerType.CAPTCHA_FAILED,
)


def matches_chat_type(trigger: Trigger, chat_type: Optional[str]) -> bool:
    """Check whether trigger is compatible with current Telegram chat type."""
    if trigger.trigger_type in JOIN_REQUEST_TYPES:
        return True
    if not hasattr(trigger, "chat_type") or trigger.chat_type == TriggerChatType.BOTH:
        return True
    if not chat_type:
        return True
    if trigger.chat_type == TriggerChatType.PRIVATE:
        return chat_type == "private"
    if trigger.chat_type == TriggerChatType.GROUP:
        return chat_type in ("group", "supergroup")
    return True


def matches_filters(trigger: Trigger, user_id: int, chat_id: int, context: Optional[dict]) -> bool:
    """Check trigger filters against user/chat/context."""
    if not trigger.filters:
        return True
    filters = trigger.filters
    trigger_context = context or {}
    if "chat_ids" in filters and chat_id not in filters["chat_ids"]:
        return False
    if "user_ids" in filters and user_id not in filters["user_ids"]:
        return False
    if "command" in filters and trigger_context.get("command", "").lower() != filters["command"].lower():
        return False
    if "text_contains" in filters and filters["text_contains"].lower() not in trigger_context.get("text", "").lower():
        return False
    return True


def is_in_delivery_window(trigger: Trigger) -> bool:
    """Check whether current time is inside trigger delivery window."""
    window = trigger.delivery_window
    if not window or not isinstance(window, dict):
        return True
    timezone_value = resolve_tz(window.get("timezone", "UTC"))
    now = datetime.now(timezone_value)
    return window.get("start_hour", 0) <= now.hour < window.get("end_hour", 24)