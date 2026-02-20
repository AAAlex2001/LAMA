from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, Field, ConfigDict


class TextTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    formatted_content: dict[str, Any]


class TextTemplateCreate(TextTemplateBase):
    pass


class TextTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    formatted_content: Optional[dict[str, Any]] = None


class TextTemplateResponse(TextTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    created_at: datetime


class TextTemplateListResponse(BaseModel):
    items: List[TextTemplateResponse]
    total: int
