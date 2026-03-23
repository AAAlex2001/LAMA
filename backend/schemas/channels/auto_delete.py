from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ChannelAutoDeleteSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: int
    delete_system_messages: bool
    delete_command_messages: bool
    delete_join_messages: bool
    delete_all_messages: bool
    delete_text_only: bool
    delete_media_only: bool
    delete_delay_seconds: int
    created_at: datetime
    updated_at: datetime


class ChannelAutoDeleteSettingsUpdate(BaseModel):
    delete_system_messages: Optional[bool] = None
    delete_command_messages: Optional[bool] = None
    delete_join_messages: Optional[bool] = None
    delete_all_messages: Optional[bool] = None
    delete_text_only: Optional[bool] = None
    delete_media_only: Optional[bool] = None
    delete_delay_seconds: Optional[int] = None
