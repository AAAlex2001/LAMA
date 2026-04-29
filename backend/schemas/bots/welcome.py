from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from backend.models.bots import CaptchaMode, MessageType


class WelcomeSettingsUpdate(BaseModel):
    welcome_enabled: Optional[bool] = None
    welcome_message: Optional[str] = None
    welcome_media_url: Optional[str] = None
    welcome_media_type: Optional[MessageType] = None
    welcome_buttons: Optional[Dict[str, Any]] = None
    welcome_message_thread_id: Optional[int] = None
    welcome_type: Optional[str] = None
    join_captcha_enabled: Optional[bool] = None
    captcha_mode: Optional[CaptchaMode] = None
    captcha_timeout_seconds: Optional[int] = Field(
        None,
        ge=5,
        le=300,
        description="Captcha timeout in seconds for group joins.",
    )


class WelcomeSettingsResponse(BaseModel):
    welcome_enabled: bool
    welcome_message: Optional[str]
    welcome_media_url: Optional[str]
    welcome_media_type: Optional[MessageType]
    welcome_buttons: Optional[Dict[str, Any]]
    welcome_message_thread_id: Optional[int]
    welcome_type: str = "group_message"
    join_captcha_enabled: bool
    captcha_mode: CaptchaMode
    captcha_timeout_seconds: int

    model_config = {"from_attributes": True}


__all__ = [
    "WelcomeSettingsUpdate",
    "WelcomeSettingsResponse",
]
