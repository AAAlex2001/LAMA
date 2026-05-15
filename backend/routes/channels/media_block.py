from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.media_block import MediaBlockResponse, MediaBlockUpdate
from backend.services.channel.features.media_block import UpdateMediaBlock
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


@router.get(
    "/{channel_id}/media-block",
    response_model=MediaBlockResponse,
    summary="Получить список типов медиа, которые блокируются в канале",
)
async def get_media_block(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return MediaBlockResponse(block_media_types=channel.block_media_types)


@router.put(
    "/{channel_id}/media-block",
    response_model=MediaBlockResponse,
    summary="Обновить список блокируемых типов медиа (стикеры, гифки, голосовые и т.д.)",
)
async def update_media_block(
    data: MediaBlockUpdate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await UpdateMediaBlock(db).execute(
        channel_id,
        current_user.id,
        data.block_media_types,
    )
    return MediaBlockResponse(block_media_types=channel.block_media_types)
