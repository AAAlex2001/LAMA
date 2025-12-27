from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

from backend.models.channels import ActionType, LinkFilterMode


class ChannelType(str, Enum):
    CHANNEL = "CHANNEL"
    GROUP = "GROUP"
    SUPERGROUP = "SUPERGROUP"


class BackupMode(str, Enum):
    DISABLED = "DISABLED"
    ENABLED = "ENABLED"
    INSTANT = "INSTANT"
    POST_FACTUM = "POST_FACTUM"


class BackupStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    IN_PROGRESS = "IN_PROGRESS"


# ============ Channel/Group Schemas ============

class ChannelGroupBase(BaseModel):
    title: str = Field(..., max_length=255)
    username: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    backup_mode: BackupMode = BackupMode.DISABLED
    backup_target_id: Optional[int] = None


class ChannelGroupCreate(BaseModel):
    telegram_id: int
    channel_type: ChannelType
    title: str = Field(..., max_length=255)
    username: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None


class ChannelGroupUpdate(BaseModel):
    """Обновление канала - только для изменения локальных настроек"""
    backup_mode: Optional[BackupMode] = None
    backup_target_id: Optional[int] = None
    is_active: Optional[bool] = None


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
    bot_id: Optional[int] = None
    
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


# ============ Sync Schemas ============

class SyncChannelRequest(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    invite_link: Optional[str] = None
    bot_id: Optional[int] = None
    token: Optional[str] = None


class SyncChannelResponse(BaseModel):
    success: bool
    channel: Optional[ChannelGroupResponse] = None
    message: str


# ============ Backup Schemas ============

class BackupModeUpdateRequest(BaseModel):
    backup_mode: BackupMode
    backup_target_id: Optional[int] = None


class BackedUpPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    telegram_message_id: int
    media_group_id: Optional[str] = None
    content_type: str
    text_content: Optional[str]
    media_urls: Optional[List[str]] = None
    media_file_ids: Optional[List[str]] = None
    views_count: int
    forwards_count: int
    original_date: datetime
    backed_up_at: datetime


class BackedUpPostListResponse(BaseModel):
    items: List[BackedUpPostResponse]
    total: int
    page: int
    page_size: int


class BackupJobCreate(BaseModel):
    source_channel_id: int
    target_channel_id: int


class BackupJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_channel_id: int
    target_channel_id: int
    status: BackupStatus
    total_posts: int
    processed_posts: int
    failed_posts: int
    started_at: datetime
    completed_at: Optional[datetime]


class BackupJobListResponse(BaseModel):
    items: List[BackupJobResponse]
    total: int
    page: int
    page_size: int


class RestoreBackupRequest(BaseModel):
    source_channel_id: int
    target_channel_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class RestoreBackupResponse(BaseModel):
    success: bool
    job_id: int
    message: str


# ============ Statistics Schemas ============

class ChannelStatsResponse(BaseModel):
    channel_id: int
    total_backed_up_posts: int
    total_retransmissions: int
    backup_size_mb: float
    first_post_date: Optional[datetime]
    last_post_date: Optional[datetime]



# ============ Channel Moderation Schemas ============

class ChannelModerationRuleCreate(BaseModel):
    action: ActionType
    phrase: str
    mute_duration_minutes: Optional[int] = None


class ChannelModerationRuleUpdate(BaseModel):
    action: Optional[ActionType] = None
    phrase: Optional[str] = None
    mute_duration_minutes: Optional[int] = None


class ChannelModerationRuleResponse(BaseModel):
    id: int
    channel_id: int
    action: ActionType
    phrase: str
    mute_duration_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChannelModerationRuleListResponse(BaseModel):
    items: List[ChannelModerationRuleResponse]
    total: int


# ============ Antispam Schemas ============

class AntispamSettingsUpdate(BaseModel):
    link_filter_mode: Optional[LinkFilterMode] = None
    link_whitelist: Optional[List[str]] = None
    link_blacklist: Optional[List[str]] = None
    link_filter_action: Optional[ActionType] = None
    link_filter_mute_duration: Optional[int] = None


class AntispamSettingsResponse(BaseModel):
    link_filter_mode: LinkFilterMode
    link_whitelist: Optional[List[str]]
    link_blacklist: Optional[List[str]]
    link_filter_action: ActionType
    link_filter_mute_duration: Optional[int]


# ============ Flood Schemas ============

class FloodSettingsUpdate(BaseModel):
    flood_message_limit: Optional[int] = Field(None, ge=1)
    flood_interval_seconds: Optional[int] = Field(None, ge=1)
    flood_action: Optional[ActionType] = None
    flood_mute_duration_minutes: Optional[int] = Field(None, ge=1)


class FloodSettingsResponse(BaseModel):
    flood_message_limit: Optional[int]
    flood_interval_seconds: Optional[int]
    flood_action: Optional[ActionType]
    flood_mute_duration_minutes: Optional[int]


# ============ Auto Delete Schemas ============


class ChannelAutoDeleteSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    delete_system_messages: bool
    delete_command_messages: bool
    created_at: datetime
    updated_at: datetime


class ChannelAutoDeleteSettingsUpdate(BaseModel):
    delete_system_messages: Optional[bool] = None
    delete_command_messages: Optional[bool] = None


# ============ Invite Link Schemas ============


class InviteLinkCreate(BaseModel):
    """Создание пригласительной ссылки"""
    name: Optional[str] = Field(None, max_length=255)
    expire_date: Optional[datetime] = None
    member_limit: Optional[int] = Field(None, ge=1, le=99999)
    creates_join_request: bool = False


class InviteLinkUpdate(BaseModel):
    """Обновление пригласительной ссылки"""
    name: Optional[str] = Field(None, max_length=255)
    expire_date: Optional[datetime] = None
    member_limit: Optional[int] = Field(None, ge=1, le=99999)
    creates_join_request: Optional[bool] = None


class InviteLinkResponse(BaseModel):
    """Ответ с данными ссылки"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    invite_link: str
    name: Optional[str]
    creator_id: Optional[int]
    creates_join_request: bool
    is_primary: bool
    is_revoked: bool
    expire_date: Optional[datetime]
    member_limit: Optional[int]
    pending_join_request_count: int
    member_count: int
    subscription_period: Optional[int]
    subscription_price: Optional[int]
    created_at: datetime
    updated_at: datetime


class InviteLinkListResponse(BaseModel):
    """Список пригласительных ссылок"""
    items: List[InviteLinkResponse]
    total: int
