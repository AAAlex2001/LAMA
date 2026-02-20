from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class PublicationSeriesBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    reply_to_previous: bool = Field(default=True)


class PublicationSeriesCreate(PublicationSeriesBase):
    pass


class PublicationSeriesUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    reply_to_previous: Optional[bool] = None


class PublicationSeriesResponse(PublicationSeriesBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
