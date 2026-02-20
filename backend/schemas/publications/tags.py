from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=7)


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=7)


class TagResponse(TagBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class TagListResponse(BaseModel):
    items: List[TagResponse]
    total: int
