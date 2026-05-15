from enum import Enum

class InboxCategory(str, Enum):
    MODERATION = "moderation"
    SYSTEM = "system"
    AUTOMATION = "automation"

class EntityType(str, Enum):
    BOT = "bot"
    CHANNEL = "channel"
    SYSTEM = "system"

class EventType(str, Enum):
    BOT_MESSAGE = "bot_message"
    BOT_COMMAND = "bot_command"
    BOT_ERROR = "bot_error"
    CHANNEL_COMMENT = "channel_comment"
    CHANNEL_JOIN_REQUEST = "channel_join_request"
    CHANNEL_LINK_JOIN = "channel_link_join"
    CHANNEL_BAN = "channel_ban"
    CHANNEL_MEMBER_JOINED = "channel_member_joined"
    CHANNEL_MEMBER_LEFT = "channel_member_left"
    CHANNEL_TITLE_CHANGED = "channel_title_changed"
    CHANNEL_PHOTO_CHANGED = "channel_photo_changed"
    CHANNEL_PINNED_MESSAGE = "channel_pinned_message"
    SYSTEM_NOTIFICATION = "system_notification"
    SYSTEM_TRIGGER = "system_trigger"
    SYSTEM_AUTOREPLY = "system_autoreply"
    SYSTEM_UPDATE = "system_update"

class EventStatus(str, Enum):
    NEW = "new"
    PROCESSED = "processed"
    IGNORED = "ignored"
    BANNED = "banned"

class SortDir(str, Enum):
    NEW_FIRST = "new"
    OLD_FIRST = "old"

class BulkActionType(str, Enum):
    READ = "read"
    IGNORE = "ignore"
    DELETE = "delete"
    BLOCK = "block"
    UNBLOCK = "unblock"
