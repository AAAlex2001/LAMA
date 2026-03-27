from fastapi import APIRouter, Depends

from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.services.channel.forum_topic_service import ForumTopicService
from backend.routes.channels.dependencies import get_forum_topic_service
from backend.schemas.channels.forum_topics import ForumTopicResponse

router = APIRouter()


@router.get("/{channel_id}/topics", response_model=list[ForumTopicResponse])
async def list_forum_topics(
    channel_id: int,
    current_user: User = Depends(get_current_user),
    service: ForumTopicService = Depends(get_forum_topic_service),
):
    return await service.get_channel_topics(channel_id, current_user.id)
