from typing import List, Optional

from pydantic import BaseModel


class MediaBlockUpdate(BaseModel):
    block_media_types: Optional[List[str]] = None


class MediaBlockResponse(BaseModel):
    block_media_types: Optional[List[str]] = None
