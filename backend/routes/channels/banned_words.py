from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.banned_words import BannedWordsToggle, BannedWordsToggleResponse
from backend.services.channel.features.banned_words import ToggleBannedWords
from backend.services.channel.utils.query_utils import find_channel_or_404

router = APIRouter()


@router.get(
    "/{channel_id}/banned-words/toggle",
    response_model=BannedWordsToggleResponse,
    summary="Включён ли фильтр запрещённых слов в канале",
)
async def get_banned_words_toggle(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await find_channel_or_404(db, channel_id, owner_id=current_user.id)
    return BannedWordsToggleResponse(banned_words_enabled=channel.banned_words_enabled)


@router.put(
    "/{channel_id}/banned-words/toggle",
    response_model=BannedWordsToggleResponse,
    summary="Включить/выключить фильтр запрещённых слов",
)
async def toggle_banned_words(
    data: BannedWordsToggle,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await ToggleBannedWords(db).execute(channel_id, current_user.id, data.enabled)
    return BannedWordsToggleResponse(banned_words_enabled=channel.banned_words_enabled)
