from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

from backend.schemas.publications.enums import InlineButtonType, CallbackActionType


class InlineButton(BaseModel):
    id: Optional[str] = None
    type: Optional[InlineButtonType] = None
    text: str
    url: Optional[str] = None
    callback_data: Optional[str] = None
    hidden_text_subscribed: Optional[str] = None
    hidden_text_unsubscribed: Optional[str] = None
    callback_action: Optional[CallbackActionType] = None
    callback_response: Optional[str] = None


class InlineKeyboard(BaseModel):
    buttons: List[List[InlineButton]]


class PollData(BaseModel):
    question: str
    options: List[str] = Field(..., min_length=2, max_length=12)
    is_anonymous: bool = True
    allows_multiple_answers: bool = False
    correct_option_id: Optional[int] = None
    explanation: Optional[str] = None
    is_quiz: bool = False


class ChannelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    title: str
    username: Optional[str] = None
    is_active: bool
    members_count: Optional[int] = None
    photo_url: Optional[str] = None


class RescheduleRequest(BaseModel):
    scheduled_time: datetime
