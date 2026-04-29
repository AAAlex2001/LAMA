from typing import Any, Dict, Optional

from pydantic import BaseModel, field_validator

from backend.models.bots import ApprovalMode


class AutoApprovalUpdate(BaseModel):
    auto_approval_mode: ApprovalMode
    approval_criteria: Optional[Dict[str, Any]] = None

    @field_validator("approval_criteria")
    @classmethod
    def validate_criteria(cls, v, info):
        mode = info.data.get("auto_approval_mode")
        if mode == ApprovalMode.CRITERIA and not v:
            raise ValueError("Criteria required for CRITERIA mode")
        return v


class AutoApprovalResponse(BaseModel):
    auto_approval_mode: ApprovalMode
    approval_criteria: Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}
