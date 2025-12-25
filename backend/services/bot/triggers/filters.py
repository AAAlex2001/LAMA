"""
Фильтры и проверки для триггеров
"""
from datetime import datetime
from typing import Optional, Dict, Any

from backend.models.bots import Trigger, TriggerChatType


def check_chat_type(trigger: Trigger, chat_type: Optional[str]) -> bool:
    """Проверить тип чата для триггера"""
    if not hasattr(trigger, 'chat_type') or trigger.chat_type == TriggerChatType.BOTH:
        return True

    if not chat_type:
        return True

    if trigger.chat_type == TriggerChatType.PRIVATE:
        return chat_type == 'private'

    if trigger.chat_type == TriggerChatType.GROUP:
        return chat_type in ('group', 'supergroup')

    return True


def check_filters(
    trigger: Trigger,
    user_id: int,
    chat_id: int,
    context: Optional[Dict[str, Any]] = None,
) -> bool:
    """Проверить фильтры триггера"""
    if not trigger.filters:
        return True

    filters = trigger.filters
    ctx = context or {}

    if "chat_ids" in filters and chat_id not in filters["chat_ids"]:
        return False

    if "user_ids" in filters and user_id not in filters["user_ids"]:
        return False

    if "command" in filters:
        cmd = ctx.get("command", "")
        if cmd.lower() != filters["command"].lower():
            return False

    if "text_contains" in filters:
        text = ctx.get("text", "")
        if filters["text_contains"].lower() not in text.lower():
            return False

    return True


def check_delivery_window(trigger: Trigger) -> bool:
    """Проверить окно доставки"""
    if not trigger.delivery_window or not isinstance(trigger.delivery_window, dict):
        return True

    import pytz

    tz_name = trigger.delivery_window.get("timezone", "UTC")
    try:
        tz = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        tz = pytz.UTC

    now = datetime.now(tz)
    start_hour = trigger.delivery_window.get("start_hour", 0)
    end_hour = trigger.delivery_window.get("end_hour", 24)

    return start_hour <= now.hour < end_hour
