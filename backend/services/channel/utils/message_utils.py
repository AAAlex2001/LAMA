from typing import Optional

from aiogram.types import Message


SYSTEM_MESSAGE_ATTRS = [
    "new_chat_members",
    "left_chat_member",
    "chat_owner_left",
    "chat_owner_changed",
    "new_chat_title",
    "new_chat_photo",
    "delete_chat_photo",
    "pinned_message",
    "successful_payment",
    "refunded_payment",
    "gift",
    "unique_gift",
    "gift_upgrade_sent",
    "proximity_alert_triggered",
    "checklist_tasks_done",
    "checklist_tasks_added",
    "direct_message_price_changed",
    "paid_message_price_changed",
    "suggested_post_approved",
    "suggested_post_approval_failed",
    "suggested_post_declined",
    "suggested_post_paid",
    "suggested_post_refunded",
    "video_chat_started",
    "video_chat_ended",
    "video_chat_scheduled",
    "video_chat_participants_invited",
    "message_auto_delete_timer_changed",
    "forum_topic_created",
    "forum_topic_closed",
    "forum_topic_reopened",
    "forum_topic_edited",
    "general_forum_topic_hidden",
    "general_forum_topic_unhidden",
    "group_chat_created",
    "supergroup_chat_created",
    "channel_chat_created",
    "migrate_to_chat_id",
    "migrate_from_chat_id",
    "boost_added",
    "chat_background_set",
    "users_shared",
    "chat_shared",
    "write_access_allowed",
    "giveaway_created",
    "giveaway",
    "giveaway_winners",
    "giveaway_completed",
    "web_app_data",
]


def is_system_message(message: Message) -> bool:
    """Определить, является ли сообщение системным."""
    return any(bool(getattr(message, attr, None)) for attr in SYSTEM_MESSAGE_ATTRS)


def is_command_message(message: Message) -> bool:
    """Определить, является ли сообщение командой."""
    text = message.text or message.caption
    return bool(text and text.strip().startswith("/"))


def is_join_message(message: Message) -> bool:
    """Определить, является ли сообщение о вступлении/выходе."""
    return bool(getattr(message, "new_chat_members", None) or getattr(message, "left_chat_member", None))


MEDIA_ATTRS = [
    "photo", "video", "document", "audio",
    "voice", "video_note", "animation", "sticker",
]


def is_text_only_message(message: Message) -> bool:
    """Определить, является ли сообщение текстовым без медиа."""
    if not message.text:
        return False
    return not any(getattr(message, attr, None) for attr in MEDIA_ATTRS)


def is_media_message(message: Message) -> bool:
    """Определить, содержит ли сообщение медиа."""
    return any(getattr(message, attr, None) for attr in MEDIA_ATTRS)


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
