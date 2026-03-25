from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

from backend.schemas.channels.enums import ChannelType, BackupMode


class ChannelGroupBase(BaseModel):
    title: str = Field(..., max_length=255)
    username: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    backup_mode: BackupMode = BackupMode.DISABLED
    backup_target_id: Optional[int] = None
    backup_target_ids: Optional[List[int]] = None


class ChannelGroupCreate(BaseModel):
    telegram_id: int
    channel_type: ChannelType
    title: str = Field(..., max_length=255)
    username: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None


class ChannelGroupUpdate(BaseModel):
    """Обновление канала - только для изменения локальных настроек"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    backup_mode: Optional[BackupMode] = None
    backup_target_id: Optional[int] = None
    backup_target_ids: Optional[List[int]] = None
    bot_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_bot_active: Optional[bool] = None
    clear_bot: Optional[bool] = None


class ChannelTelegramUpdate(BaseModel):
    """Обновление параметров канала через Telegram API"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    photo_file_path: Optional[str] = None


class ChannelPermissionsUpdate(BaseModel):
    """Обновление разрешений канала через Telegram API (ChatPermissions)"""
    can_send_messages: Optional[bool] = None
    can_send_audios: Optional[bool] = None
    can_send_documents: Optional[bool] = None
    can_send_photos: Optional[bool] = None
    can_send_videos: Optional[bool] = None
    can_send_video_notes: Optional[bool] = None
    can_send_voice_notes: Optional[bool] = None
    can_send_polls: Optional[bool] = None
    can_send_other_messages: Optional[bool] = None
    can_add_web_page_previews: Optional[bool] = None
    can_change_info: Optional[bool] = None
    can_invite_users: Optional[bool] = None
    can_pin_messages: Optional[bool] = None
    can_manage_topics: Optional[bool] = None
    night_mode_enabled: Optional[bool] = None
    night_mode_start: Optional[str] = Field(
        None, pattern=r"^\d{2}:\d{2}$", description="Start time in HH:MM"
    )
    night_mode_end: Optional[str] = Field(
        None, pattern=r"^\d{2}:\d{2}$", description="End time in HH:MM"
    )
    night_mode_block_media: Optional[bool] = None
    night_mode_block_text: Optional[bool] = None


class ChannelGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    channel_type: ChannelType

    # Basic info
    title: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    description: Optional[str] = None
    invite_link: Optional[str] = None
    bio: Optional[str] = None

    # Chat appearance
    accent_color_id: Optional[int] = None
    profile_accent_color_id: Optional[int] = None
    background_custom_emoji_id: Optional[str] = None
    profile_background_custom_emoji_id: Optional[str] = None
    emoji_status_custom_emoji_id: Optional[str] = None
    emoji_status_expiration_date: Optional[int] = None

    # Chat settings/features
    is_forum: Optional[bool] = False
    is_direct_messages: Optional[bool] = False
    max_reaction_count: Optional[int] = None
    slow_mode_delay: Optional[int] = None
    unrestrict_boost_count: Optional[int] = None
    message_auto_delete_time: Optional[int] = None
    night_mode_enabled: bool
    night_mode_start: Optional[str] = None
    night_mode_end: Optional[str] = None
    night_mode_block_media: bool
    night_mode_block_text: bool

    # Privacy & restrictions
    has_private_forwards: Optional[bool] = False
    has_restricted_voice_and_video_messages: Optional[bool] = False
    has_aggressive_anti_spam_enabled: Optional[bool] = False
    has_hidden_members: Optional[bool] = False
    has_protected_content: Optional[bool] = False
    has_visible_history: Optional[bool] = False
    join_to_send_messages: Optional[bool] = False
    join_by_request: Optional[bool] = False
    can_send_paid_media: Optional[bool] = False
    captcha_enabled: bool = False

    # Stickers
    sticker_set_name: Optional[str] = None
    can_set_sticker_set: Optional[bool] = False
    custom_emoji_sticker_set_name: Optional[str] = None

    # Linked chats & location
    linked_chat_id: Optional[int] = None
    parent_chat_id: Optional[int] = None
    location_address: Optional[str] = None
    location_latitude: Optional[str] = None
    location_longitude: Optional[str] = None

    # Statistics
    members_count: int = 0

    # Photo
    photo_url: Optional[str] = None
    photo_small_file_id: Optional[str] = None
    photo_small_file_unique_id: Optional[str] = None
    photo_big_file_id: Optional[str] = None
    photo_big_file_unique_id: Optional[str] = None

    # Permissions (JSON)
    permissions: Optional[dict] = None
    available_reactions: Optional[list] = None
    accepted_gift_types: Optional[dict] = None
    active_usernames: Optional[list] = None
    pinned_message: Optional[dict] = None

    # Business account fields
    business_intro: Optional[dict] = None
    business_location: Optional[dict] = None
    business_opening_hours: Optional[dict] = None
    birthdate: Optional[dict] = None
    personal_chat: Optional[dict] = None

    # Backup settings
    backup_mode: BackupMode
    backup_target_id: Optional[int] = None
    backup_target_ids: Optional[list] = None
    backup_post_types: Optional[list] = None
    backup_content_types: Optional[list] = None
    backup_ai_prompt: Optional[str] = None
    bot_id: Optional[int] = None
    is_bot_active: bool = True

    # Quick commands
    commands_enabled: bool = False
    enabled_commands: Optional[list] = None

    # Media block
    block_media_types: Optional[list] = None

    # Metadata
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Extra data
    extra_data: Optional[dict] = None


class ChannelGroupListResponse(BaseModel):
    items: List[ChannelGroupResponse]
    total: int
    page: int
    page_size: int
