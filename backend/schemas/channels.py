from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ChannelType(str, Enum):
    CHANNEL = "CHANNEL"
    GROUP = "GROUP"
    SUPERGROUP = "SUPERGROUP"


class BackupMode(str, Enum):
    DISABLED = "DISABLED"
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
    title: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    backup_mode: Optional[BackupMode] = None
    backup_target_id: Optional[int] = None
    is_active: Optional[bool] = None


class ChannelGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    channel_type: ChannelType
    title: str
    username: Optional[str]
    description: Optional[str]
    invite_link: Optional[str]
    members_count: int
    photo_url: Optional[str]
    backup_mode: BackupMode
    backup_target_id: Optional[int]
    is_active: bool
    last_sync_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class ChannelGroupListResponse(BaseModel):
    items: List[ChannelGroupResponse]
    total: int
    page: int
    page_size: int


# ============ Sync Schemas ============

class SyncChannelRequest(BaseModel):
    telegram_id: int


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


