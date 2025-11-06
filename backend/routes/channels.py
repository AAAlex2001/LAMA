"""
API endpoints для модуля "Каналы/группы":
- CRUD операции
- Синхронизация через Telegram API
- Управление бекапами и перезаливом постов
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List, Optional

from backend.models.channel import (
    ChannelCreate,
    ChannelUpdate,
    ChannelResponse,
    ChannelSyncRequest,
    ChannelSyncResponse,
    BackupPostResponse,
    CopyPostsRequest,
    CopyPostsResponse,
    ChannelListResponse,
)
from backend.services.channel_service import ChannelService
from backend.services.bot_service import BotService


router = APIRouter(prefix="/channels", tags=["channels"])


def get_channel_service(request: Request) -> ChannelService:
    """Получение сервиса каналов из состояния приложения."""
    return request.app.state.channel_service


@router.post("", response_model=ChannelResponse, status_code=201)
async def create_channel(
    data: ChannelCreate,
    channel_service: ChannelService = Depends(get_channel_service),
) -> ChannelResponse:
    """Создание нового канала/группы."""
    try:
        return await channel_service.create(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при создании канала: {str(e)}")


@router.get("", response_model=ChannelListResponse)
async def list_channels(
    channel_service: ChannelService = Depends(get_channel_service),
) -> ChannelListResponse:
    """Получение списка всех каналов/групп."""
    channels = await channel_service.list()
    return ChannelListResponse(channels=channels, total=len(channels))


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    channel_service: ChannelService = Depends(get_channel_service),
) -> ChannelResponse:
    """Получение информации о канале/группе."""
    try:
        return await channel_service.get(channel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: str,
    data: ChannelUpdate,
    channel_service: ChannelService = Depends(get_channel_service),
) -> ChannelResponse:
    """Обновление параметров канала/группы."""
    try:
        return await channel_service.update(channel_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении канала: {str(e)}")


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: str,
    channel_service: ChannelService = Depends(get_channel_service),
):
    """Удаление канала/группы."""
    success = await channel_service.delete(channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Канал не найден")


@router.post("/{channel_id}/sync", response_model=ChannelSyncResponse)
async def sync_channel(
    channel_id: str,
    channel_service: ChannelService = Depends(get_channel_service),
) -> ChannelSyncResponse:
    """Ручная синхронизация данных канала из Telegram API."""
    try:
        return await channel_service.sync_channel(channel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при синхронизации: {str(e)}")


@router.get("/{channel_id}/backup-posts", response_model=List[BackupPostResponse])
async def get_backup_posts(
    channel_id: str,
    channel_service: ChannelService = Depends(get_channel_service),
) -> List[BackupPostResponse]:
    """Получение списка сохраненных постов канала."""
    try:
        return await channel_service.get_backup_posts(channel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/copy-posts", response_model=CopyPostsResponse)
async def copy_posts(
    data: CopyPostsRequest,
    channel_service: ChannelService = Depends(get_channel_service),
) -> CopyPostsResponse:
    """Копирование постов из одного канала в другой (для режима postfactum)."""
    try:
        return await channel_service.copy_posts(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при копировании постов: {str(e)}")


@router.get("/{channel_id}/history")
async def get_channel_history(
    channel_id: str,
    limit: Optional[int] = None,
    offset: int = 0,
    channel_service: ChannelService = Depends(get_channel_service),
):
    """Получение истории постов канала из бекапа."""
    try:
        posts = await channel_service.fetch_channel_history(channel_id, limit=limit, offset=offset)
        return {
            "channel_id": channel_id,
            "posts": [
                {
                    "message_id": post.message_id,
                    "date": post.date.isoformat(),
                    "has_text": post.text is not None,
                    "has_media": post.media is not None and len(post.media) > 0,
                }
                for post in posts
            ],
            "total": len(posts),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

