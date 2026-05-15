from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.channels.info_messages import (
    AutoReplyToggle,
    InfoMessageCreate,
    InfoMessageResponse,
    InfoMessagesListResponse,
    InfoMessagesToggle,
    InfoMessageUpdate,
)
from backend.services.channel.features.info_messages.create_message import CreateInfoMessage
from backend.services.channel.features.info_messages.delete_message import DeleteInfoMessage
from backend.services.channel.features.info_messages.generate_share_token import GenerateShareToken
from backend.services.channel.features.info_messages.list_messages import ListInfoMessages
from backend.services.channel.features.info_messages.publish_message import PublishInfoMessage
from backend.services.channel.features.info_messages.toggle_auto_reply import ToggleAutoReply
from backend.services.channel.features.info_messages.toggle_enabled import ToggleInfoMessages
from backend.services.channel.features.info_messages.update_message import UpdateInfoMessage

router = APIRouter()


@router.get(
    "/{channel_id}/info-messages",
    response_model=InfoMessagesListResponse,
    summary="Список инфо-сообщений канала (приветствия, FAQ, правила)",
)
async def list_info_messages(
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ListInfoMessages(db).execute(channel_id=channel_id, owner_id=current_user.id)


@router.put(
    "/{channel_id}/auto-replies/toggle",
    summary="Включить/выключить авто-ответы бота в канале",
)
async def toggle_auto_reply_enabled(
    data: AutoReplyToggle,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ToggleAutoReply(db).execute(channel_id=channel_id, enabled=data.enabled, owner_id=current_user.id)
    return {"ok": True}


@router.put(
    "/{channel_id}/info-messages/toggle",
    summary="Включить/выключить отправку инфо-сообщений в канале",
)
async def toggle_info_messages(
    data: InfoMessagesToggle,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ToggleInfoMessages(db).execute(channel_id=channel_id, enabled=data.enabled, owner_id=current_user.id)
    return {"ok": True}


@router.post(
    "/{channel_id}/info-messages",
    response_model=InfoMessageResponse,
    status_code=201,
    summary="Создать инфо-сообщение",
)
async def create_info_message(
    data: InfoMessageCreate,
    channel_id: int = Path(..., description="ID канала."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CreateInfoMessage(db).execute(channel_id=channel_id, data=data, owner_id=current_user.id)


@router.put(
    "/{channel_id}/info-messages/{message_id}",
    response_model=InfoMessageResponse,
    summary="Обновить инфо-сообщение",
)
async def update_info_message(
    data: InfoMessageUpdate,
    channel_id: int = Path(..., description="ID канала."),
    message_id: int = Path(..., description="ID инфо-сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UpdateInfoMessage(db).execute(
        channel_id=channel_id, message_id=message_id, data=data, owner_id=current_user.id,
    )


@router.delete(
    "/{channel_id}/info-messages/{message_id}",
    status_code=204,
    summary="Удалить инфо-сообщение",
)
async def delete_info_message(
    channel_id: int = Path(..., description="ID канала."),
    message_id: int = Path(..., description="ID инфо-сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await DeleteInfoMessage(db).execute(channel_id=channel_id, message_id=message_id, owner_id=current_user.id)


@router.post(
    "/{channel_id}/info-messages/{message_id}/publish",
    response_model=InfoMessageResponse,
    summary="Опубликовать инфо-сообщение в канал прямо сейчас",
)
async def publish_info_message(
    channel_id: int = Path(..., description="ID канала."),
    message_id: int = Path(..., description="ID инфо-сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await PublishInfoMessage(db).execute(
        channel_id=channel_id, message_id=message_id, owner_id=current_user.id,
    )


@router.post(
    "/{channel_id}/info-messages/{message_id}/share",
    summary="Сгенерировать share-токен инфо-сообщения для шаринга на просмотр",
)
async def share_info_message(
    channel_id: int = Path(..., description="ID канала."),
    message_id: int = Path(..., description="ID инфо-сообщения."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = await GenerateShareToken(db).execute(
        channel_id=channel_id, message_id=message_id, owner_id=current_user.id,
    )
    return {"share_token": token}
