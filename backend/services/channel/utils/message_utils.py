from typing import Optional

from aiogram.types import Message


SYSTEM_MESSAGE_ATTRS = [
    "new_chat_members",
    "left_chat_member",
    "new_chat_title",
    "new_chat_photo",
    "delete_chat_photo",
    "pinned_message",
    "successful_payment",
    "proximity_alert_triggered",
    "video_chat_started",
    "video_chat_ended",
    "video_chat_participants_invited",
    "message_auto_delete_timer_changed",
    "forum_topic_created",
    "forum_topic_closed",
    "forum_topic_reopened",
]


def is_system_message(message: Message) -> bool:
    """Определить, является ли сообщение системным."""
    return any(bool(getattr(message, attr, None)) for attr in SYSTEM_MESSAGE_ATTRS)


def is_command_message(message: Message) -> bool:
    """Определить, является ли сообщение командой."""
    text = message.text or message.caption
    return bool(text and text.strip().startswith("/"))


def time_to_minutes(value: Optional[str]) -> Optional[int]:
    """Преобразовать строку HH:MM в минуты от начала суток."""
    if not value:
        return None
    try:
        hours_str, minutes_str = value.split(":")
        hours, minutes = int(hours_str), int(minutes_str)
        if not (0 <= hours < 24 and 0 <= minutes < 60):
            return None
        return hours * 60 + minutes
    except (ValueError, AttributeError):
        return None


def is_within_window(current: int, start: int, end: int) -> bool:
    """Проверить, находится ли текущее время в окне."""
    if start == end:
        return False
    if start < end:
        return start <= current < end
    return current >= start or current < end
