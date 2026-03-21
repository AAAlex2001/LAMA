from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from backend.schemas.channels.enums import BackupMode, BackupStatus


class BackupModeUpdateRequest(BaseModel):
    backup_mode: BackupMode
    backup_target_ids: Optional[List[int]] = None
    backup_post_types: Optional[List[str]] = None
    backup_content_types: Optional[List[str]] = None
    backup_ai_prompt: Optional[str] = None


class BackedUpPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    telegram_message_id: int
    media_group_id: Optional[str] = None
    content_type: str
    text_content: Optional[str]
    media_urls: Optional[List[str]] = None
    media_file_ids: Optional[List[Optional[str]]] = None
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
    content_types: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


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
    content_types: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class RestoreBackupResponse(BaseModel):
    success: bool
    job_id: int
    message: str


class ChannelStatsResponse(BaseModel):
    channel_id: int
    total_backed_up_posts: int
    total_retransmissions: int
    backup_size_mb: float
    first_post_date: Optional[datetime]
    last_post_date: Optional[datetime]
