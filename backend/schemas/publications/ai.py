from typing import Optional

from pydantic import BaseModel, Field

from backend.schemas.publications.enums import ContentType


class AIGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=1000)
    content_type: ContentType = ContentType.TEXT
    tone: Optional[str] = "neutral"
    max_length: Optional[int] = Field(500, ge=50, le=4000)


class AIEditRequest(BaseModel):
    publication_id: int
    instruction: str = Field(..., min_length=10, max_length=500)


class AIEditTextRequest(BaseModel):
    text: str = Field(..., min_length=0, max_length=20000)
    instruction: str = Field(..., min_length=1, max_length=500)


class AIEditTextResponse(BaseModel):
    result: str
