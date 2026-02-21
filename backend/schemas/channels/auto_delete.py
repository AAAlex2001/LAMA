from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


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
