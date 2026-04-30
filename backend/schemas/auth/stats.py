from pydantic import BaseModel


class UserStatsResponse(BaseModel):
    user_id: int
    total_bots: int
    active_bots: int
    total_channels: int
    active_channels: int
    total_publications: int
    published_publications: int
    total_sessions: int
    active_sessions: int
