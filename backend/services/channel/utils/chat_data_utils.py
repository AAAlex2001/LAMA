from aiogram import Bot
from aiogram.types import Chat

from backend.models.channels import ChannelType


def dump_model(obj) -> dict:
    """Сериализовать pydantic-модель в JSON dict."""
    if obj is None:
        return None
    return obj.model_dump(mode="json", exclude_defaults=True)


async def fetch_photo_data(bot: Bot, chat: Chat, bot_token: str) -> dict:
    """Получить данные фото чата."""
    empty = {
        "photo_url": None,
        "photo_small_file_id": None,
        "photo_small_file_unique_id": None,
        "photo_big_file_id": None,
        "photo_big_file_unique_id": None,
    }
    if not chat.photo:
        return empty
    try:
        photo_file = await bot.get_file(chat.photo.big_file_id)
        return {
            "photo_url": f"https://api.telegram.org/file/bot{bot_token}/{photo_file.file_path}",
            "photo_small_file_id": chat.photo.small_file_id,
            "photo_small_file_unique_id": chat.photo.small_file_unique_id,
            "photo_big_file_id": chat.photo.big_file_id,
            "photo_big_file_unique_id": chat.photo.big_file_unique_id,
        }
    except Exception:
        return empty


def resolve_channel_type(chat: Chat) -> ChannelType:
    """Определить тип канала по типу чата."""
    if chat.type == "group":
        return ChannelType.GROUP
    if chat.type == "supergroup":
        return ChannelType.SUPERGROUP
    return ChannelType.CHANNEL


async def build_chat_data(bot: Bot, chat: Chat, bot_token: str) -> dict:
    """Собрать данные чата для сохранения."""
    members_count = 0
    try:
        members_count = await bot.get_chat_member_count(chat.id)
    except Exception:
        pass

    photo_data = await fetch_photo_data(bot, chat, bot_token)

    chat_data = {
        "channel_type": resolve_channel_type(chat),
        "title": chat.title or f"Channel {chat.id}",
        "username": getattr(chat, "username", None),
        "first_name": getattr(chat, "first_name", None),
        "last_name": getattr(chat, "last_name", None),
        "description": getattr(chat, "description", None),
        "invite_link": getattr(chat, "invite_link", None),
        "bio": getattr(chat, "bio", None),
        "accent_color_id": getattr(chat, "accent_color_id", None),
        "profile_accent_color_id": getattr(chat, "profile_accent_color_id", None),
        "background_custom_emoji_id": getattr(chat, "background_custom_emoji_id", None),
        "profile_background_custom_emoji_id": getattr(chat, "profile_background_custom_emoji_id", None),
        "emoji_status_custom_emoji_id": getattr(chat, "emoji_status_custom_emoji_id", None),
        "emoji_status_expiration_date": getattr(chat, "emoji_status_expiration_date", None),
        "is_forum": getattr(chat, "is_forum", False),
        "is_direct_messages": getattr(chat, "is_direct_messages", False),
        "max_reaction_count": getattr(chat, "max_reaction_count", None),
        "slow_mode_delay": getattr(chat, "slow_mode_delay", None),
        "unrestrict_boost_count": getattr(chat, "unrestrict_boost_count", None),
        "message_auto_delete_time": getattr(chat, "message_auto_delete_time", None),
        "has_private_forwards": getattr(chat, "has_private_forwards", False),
        "has_restricted_voice_and_video_messages": getattr(chat, "has_restricted_voice_and_video_messages", False),
        "has_aggressive_anti_spam_enabled": getattr(chat, "has_aggressive_anti_spam_enabled", False),
        "has_hidden_members": getattr(chat, "has_hidden_members", False),
        "has_protected_content": getattr(chat, "has_protected_content", False),
        "has_visible_history": getattr(chat, "has_visible_history", False),
        "join_to_send_messages": getattr(chat, "join_to_send_messages", False),
        "join_by_request": getattr(chat, "join_by_request", False),
        "can_send_paid_media": getattr(chat, "can_send_paid_media", False),
        "sticker_set_name": getattr(chat, "sticker_set_name", None),
        "can_set_sticker_set": getattr(chat, "can_set_sticker_set", False),
        "custom_emoji_sticker_set_name": getattr(chat, "custom_emoji_sticker_set_name", None),
        "linked_chat_id": getattr(chat, "linked_chat_id", None),
        "parent_chat_id": getattr(getattr(chat, "parent_chat", None), "id", None),
        "members_count": members_count,
        **photo_data,
        "permissions": dump_model(getattr(chat, "permissions", None)),
        "available_reactions": (
            [dump_model(r) for r in chat.available_reactions]
            if hasattr(chat, "available_reactions") and chat.available_reactions else None
        ),
        "accepted_gift_types": dump_model(getattr(chat, "accepted_gift_types", None)),
        "active_usernames": getattr(chat, "active_usernames", None),
        "pinned_message": dump_model(getattr(chat, "pinned_message", None)),
        "business_intro": dump_model(getattr(chat, "business_intro", None)),
        "business_location": dump_model(getattr(chat, "business_location", None)),
        "business_opening_hours": dump_model(getattr(chat, "business_opening_hours", None)),
        "birthdate": dump_model(getattr(chat, "birthdate", None)),
        "personal_chat": dump_model(getattr(chat, "personal_chat", None)),
        "location_address": (
            getattr(chat.location, "address", None)
            if hasattr(chat, "location") and chat.location else None
        ),
        "location_latitude": (
            str(chat.location.location.latitude)
            if hasattr(chat, "location") and chat.location and hasattr(chat.location, "location") else None
        ),
        "location_longitude": (
            str(chat.location.location.longitude)
            if hasattr(chat, "location") and chat.location and hasattr(chat.location, "location") else None
        ),
    }
    return chat_data
