from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.schemas.ad_revenues.enums import AdRevenueType


class AdRevenueBase(BaseModel):
    type: AdRevenueType
    buyer: Optional[str] = Field(None, max_length=255)
    amount: Decimal = Field(..., ge=0)
    currency: str = Field(default="RUB", max_length=8)
    revenue_date: date
    note: Optional[str] = None
    publication_id: Optional[int] = None
    channel_id: Optional[int] = None
    bot_id: Optional[int] = None
    channel_username: Optional[str] = Field(None, max_length=255)
    post_link: Optional[str] = Field(None, max_length=512)
    is_pinned: bool = False
    is_auto_delete: bool = False
    is_repeating: bool = False


class AdRevenueCreate(AdRevenueBase):
    pass


class AdRevenueUpdate(BaseModel):
    type: Optional[AdRevenueType] = None
    buyer: Optional[str] = Field(None, max_length=255)
    amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=8)
    revenue_date: Optional[date] = None
    note: Optional[str] = None
    publication_id: Optional[int] = None
    channel_id: Optional[int] = None
    bot_id: Optional[int] = None
    channel_username: Optional[str] = Field(None, max_length=255)
    post_link: Optional[str] = Field(None, max_length=512)
    is_pinned: Optional[bool] = None
    is_auto_delete: Optional[bool] = None
    is_repeating: Optional[bool] = None


class AdRevenueResponse(AdRevenueBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    # Метрики (агрегаты по telegram_messages привязанной публикации)
    views_count: int = 0
    forwards_count: int = 0
    reactions_count: int = 0
    comments_count: int = 0
    clicks_count: int = 0
    post_link: Optional[str] = None


class AdRevenueListResponse(BaseModel):
    items: List[AdRevenueResponse]
    total: int


class AdRevenueStats(BaseModel):
    income_total: Decimal
    expense_total: Decimal
    profit: Decimal
    income_count: int
    expense_count: int
    published_ads_count: int = 0
    scheduled_ads_count: int = 0
    currency: str = "RUB"
    currencies: List[str] = Field(default_factory=list)
