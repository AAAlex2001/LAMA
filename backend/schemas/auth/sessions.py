from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    expires_at: datetime
    is_active: bool
    user_agent: str | None = None
    ip_address: str | None = None
    created_at: datetime
    last_used_at: datetime


class SessionListResponse(BaseModel):
    items: list[SessionResponse]
    total: int
