from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

from backend.models.bots import ApprovalMode, MessageType, CaptchaMode

# ============================================================================
# Auto Approval Schemas
# ============================================================================

class AutoApprovalUpdate(BaseModel):
    """Схема обновления настроек автоодобрения"""
    auto_approval_mode: ApprovalMode
    approval_criteria: Optional[Dict[str, Any]] = None

    @field_validator("approval_criteria")
    @classmethod
    def validate_criteria(cls, v, info):
        """Валидация критериев"""
        mode = info.data.get("auto_approval_mode")
        if mode == ApprovalMode.CRITERIA and not v:
            raise ValueError("Criteria required for CRITERIA mode")
        return v

class AutoApprovalResponse(BaseModel):
    """Схема ответа настроек автоодобрения"""
    auto_approval_mode: ApprovalMode
    approval_criteria: Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}

# ============================================================================
# Welcome Settings Schemas
# ============================================================================

class WelcomeSettingsUpdate(BaseModel):
    """Схема обновления настроек приветствия (partial update)"""
    welcome_enabled: Optional[bool] = None
    welcome_message: Optional[str] = None
    welcome_media_url: Optional[str] = None
    welcome_media_type: Optional[MessageType] = None
    welcome_buttons: Optional[Dict[str, Any]] = None
    welcome_message_thread_id: Optional[int] = None
    welcome_type: Optional[str] = None
    join_captcha_enabled: Optional[bool] = None
    captcha_mode: Optional[CaptchaMode] = None
    captcha_timeout_seconds: Optional[int] = Field(None, ge=5, le=300, description="Таймаут капчи в группе (5-300 секунд)")

class WelcomeSettingsResponse(BaseModel):
    """Схема ответа настроек приветствия"""
    welcome_enabled: bool
    welcome_message: Optional[str]
    welcome_media_url: Optional[str]
    welcome_media_type: Optional[MessageType]
    welcome_buttons: Optional[Dict[str, Any]]
    welcome_message_thread_id: Optional[int]
    welcome_type: str
    join_captcha_enabled: bool  # DEPRECATED
    captcha_mode: CaptchaMode
    captcha_timeout_seconds: int

    model_config = {"from_attributes": True}
