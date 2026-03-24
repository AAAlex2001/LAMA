from pydantic import BaseModel, Field
from typing import Optional

from backend.models.channels import CaptchaFailAction


class CaptchaSettingsUpdate(BaseModel):
    captcha_enabled: Optional[bool] = None
    captcha_timeout_seconds: Optional[int] = Field(None, ge=10, le=300)
    captcha_fail_action: Optional[CaptchaFailAction] = None
    captcha_fail_duration_seconds: Optional[int] = Field(None, ge=60, le=86400)
    captcha_restriction_type: Optional[str] = None
    captcha_message_before: Optional[str] = Field(None, max_length=1024)
    captcha_message_fail: Optional[str] = Field(None, max_length=1024)
    captcha_message_success: Optional[str] = Field(None, max_length=1024)


class CaptchaSettingsResponse(BaseModel):
    captcha_enabled: bool
    captcha_timeout_seconds: int
    captcha_fail_action: CaptchaFailAction
    captcha_fail_duration_seconds: Optional[int]
    captcha_restriction_type: Optional[str]
    captcha_message_before: Optional[str]
    captcha_message_fail: Optional[str]
    captcha_message_success: Optional[str]
