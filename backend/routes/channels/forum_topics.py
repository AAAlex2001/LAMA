from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.forum_topics import ForumTopicResponse
from backend.services.channel.features.forum_topics import ListChannelTopics

router = APIRouter()


@router.get("/{channel_id}/topics", response_model=list[ForumTopicResponse])
async def list_forum_topics(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ListChannelTopics(db).execute(channel_id, current_user.id)
