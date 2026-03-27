from typing import Optional

from pydantic import BaseModel


class ForumTopicResponse(BaseModel):
    thread_id: int
    name: str
    icon_color: Optional[int] = None
    icon_custom_emoji_id: Optional[str] = None
    is_closed: bool = False

    model_config = {"from_attributes": True}
