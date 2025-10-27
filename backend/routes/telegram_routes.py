"""
API endpoints для управления Telegram публикациями.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from backend.services.telegram_service import TelegramService
from backend.models.publication import PublicationCreate


router = APIRouter(prefix="/telegram", tags=["telegram"])
telegram_service = TelegramService()


class PublishRequest(BaseModel):
    """Запрос на публикацию в канал."""
    channel_id: str
    publication: PublicationCreate
    publication_id: str


class PublishResponse(BaseModel):
    """Ответ на публикацию."""
    success: bool
    message_id: Optional[int] = None
    channel_id: str
    error: Optional[str] = None


class EditMessageRequest(BaseModel):
    """Запрос на редактирование сообщения."""
    channel_id: str
    message_id: int
    new_text: str


class DeleteMessageRequest(BaseModel):
    """Запрос на удаление сообщения."""
    channel_id: str
    message_id: int


@router.post("/publish", response_model=PublishResponse)
async def publish_to_channel(request: PublishRequest) -> PublishResponse:
    """Публикация в Telegram канал."""
    result = await telegram_service.publish_to_channel(
        channel_id=request.channel_id,
        publication=request.publication,
        publication_id=request.publication_id,
    )
    return PublishResponse(**result)


@router.post("/edit")
async def edit_message(request: EditMessageRequest):
    """Редактирование сообщения в канале."""
    success = await telegram_service.edit_message(
        channel_id=request.channel_id,
        message_id=request.message_id,
        new_text=request.new_text,
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to edit message")
    return {"success": True}


@router.post("/delete")
async def delete_message(request: DeleteMessageRequest):
    """Удаление сообщения из канала."""
    success = await telegram_service.delete_message(
        channel_id=request.channel_id,
        message_id=request.message_id,
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete message")
    return {"success": True}


@router.post("/pin")
async def pin_message(channel_id: str, message_id: int):
    """Закрепление сообщения."""
    success = await telegram_service.pin_message(channel_id, message_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to pin message")
    return {"success": True}


@router.post("/unpin")
async def unpin_message(channel_id: str, message_id: int):
    """Открепление сообщения."""
    success = await telegram_service.unpin_message(channel_id, message_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to unpin message")
    return {"success": True}


@router.get("/channel/{channel_id}")
async def get_channel_info(channel_id: str):
    """Получение информации о канале."""
    info = await telegram_service.get_channel_info(channel_id)
    if "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])
    return info

