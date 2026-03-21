from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


class InviteLinkCreate(BaseModel):
    """Создание пригласительной ссылки"""
    name: Optional[str] = Field(None, max_length=255)
    expire_date: Optional[datetime] = None
    member_limit: Optional[int] = Field(None, ge=0, le=99999)
    creates_join_request: bool = False
    protection_type: Literal["none", "captcha", "admin"] = "none"
    entry_method: Literal["direct", "bot"] = "direct"


class InviteLinkUpdate(BaseModel):
    """Обновление пригласительной ссылки"""
    name: Optional[str] = Field(None, max_length=255)
    expire_date: Optional[datetime] = None
    member_limit: Optional[int] = Field(None, ge=0, le=99999)
    creates_join_request: Optional[bool] = None
    protection_type: Optional[Literal["none", "captcha", "admin"]] = None
    entry_method: Optional[Literal["direct", "bot"]] = None


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
    protection_type: Optional[str] = "none"
    entry_method: Optional[str] = "direct"
    created_at: datetime
    updated_at: datetime


class InviteLinkListResponse(BaseModel):
    """Список пригласительных ссылок"""
    items: List[InviteLinkResponse]
    total: int
