from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database import get_db
from backend.services.channel import ChannelService, ChannelModerationService
from backend.routes.auth import get_current_user
from backend.models.auth import User
from backend.schemas.channels import (
    ChannelGroupCreate, ChannelGroupUpdate, ChannelGroupResponse, ChannelGroupListResponse,
    SyncChannelRequest, SyncChannelResponse, ChannelTelegramUpdate, ChannelPermissionsUpdate,
    BackupModeUpdateRequest, BackedUpPostListResponse, BackupJobCreate, BackupJobResponse,
    BackupJobListResponse, RestoreBackupRequest, RestoreBackupResponse, ChannelStatsResponse,
    ChannelType, BackupMode, BackupStatus,
    ChannelModerationRuleCreate, ChannelModerationRuleUpdate,
    ChannelModerationRuleResponse, ChannelModerationRuleListResponse,
)


router = APIRouter(prefix="/channels", tags=["channels"])


async def get_channel_service(db: AsyncSession = Depends(get_db)):
    return ChannelService(db)

async def get_channel_moderation_service(db: AsyncSession = Depends(get_db)):
    return ChannelModerationService(db)


# ============ CRUD Operations ============

@router.post("/", response_model=ChannelGroupResponse, status_code=201)
async def create_channel(
    data: ChannelGroupCreate,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Создать канал/группу вручную"""
    channel = await service.create_channel(data, owner_id=current_user.id)
    return channel


@router.get("/", response_model=ChannelGroupListResponse)
async def list_channels(
    page: int = 1,
    page_size: int = 50,
    channel_type: Optional[ChannelType] = None,
    is_active: Optional[bool] = None,
    backup_mode: Optional[BackupMode] = None,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Получить список каналов с фильтрацией"""
    channels, total = await service.list_channels(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        channel_type=channel_type,
        is_active=is_active,
        backup_mode=backup_mode
    )
    return ChannelGroupListResponse(
        items=channels,
        total=total,
        page=page,
        page_size=page_size
    )


# ============ Telegram Sync ============

@router.post("/sync", response_model=SyncChannelResponse)
async def sync_channel(
    data: SyncChannelRequest,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """
    Синхронизировать канал/группу через Telegram API
    
    Можно передать один из идентификаторов:
    - telegram_id: числовой ID (-100...)
    - username: @username или просто username
    - invite_link: https://t.me/username
    """
    try:
        channel = await service.sync_channel_from_telegram(
            telegram_id=data.telegram_id,
            username=data.username,
            invite_link=data.invite_link,
            owner_id=current_user.id,
            bot_id=data.bot_id,
            token=data.token
        )
        return SyncChannelResponse(
            success=True,
            channel=channel,
            message="Channel synchronized successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/{channel_id}/sync", response_model=ChannelGroupResponse)
async def sync_existing_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Обновить информацию существующего канала через Telegram API"""
    channel = await service.get_channel(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    if not channel.bot_id:
        raise HTTPException(status_code=400, detail="Channel does not have an associated bot. Please use POST /channels/sync with bot_id or token")
    
    try:
        updated_channel = await service.sync_channel_from_telegram(
            telegram_id=channel.telegram_id,
            username=channel.username,
            invite_link=channel.invite_link,
            owner_id=current_user.id,
            bot_id=channel.bot_id
        )
        return updated_channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ============ Backup Management ============

@router.post("/{channel_id}/backup-mode", response_model=ChannelGroupResponse)
async def update_backup_mode(
    channel_id: int,
    data: BackupModeUpdateRequest,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Настроить режим бекапа для канала"""
    try:
        channel = await service.update_backup_mode(
            channel_id=channel_id,
            backup_mode=data.backup_mode,
            backup_target_id=data.backup_target_id,
            owner_id=current_user.id
        )
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{channel_id}/backed-posts", response_model=BackedUpPostListResponse)
async def get_backed_up_posts(
    channel_id: int,
    page: int = 1,
    page_size: int = 50,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Получить список бекапнутых постов канала"""
    channel = await service.get_channel(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    posts, total = await service.get_backed_up_posts(
        channel_id=channel_id,
        page=page,
        page_size=page_size
    )
    
    return BackedUpPostListResponse(
        items=posts,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{channel_id}/stats", response_model=ChannelStatsResponse)
async def get_channel_stats(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику по каналу"""
    channel = await service.get_channel(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    stats = await service.get_channel_stats(channel_id)
    return ChannelStatsResponse(**stats)


# ============ Moderation Rules ============

@router.post(
    "/{channel_id}/moderation/rules",
    response_model=ChannelModerationRuleResponse,
    status_code=201,
)
async def create_moderation_rule(
    channel_id: int,
    data: ChannelModerationRuleCreate,
    moderation_service: ChannelModerationService = Depends(get_channel_moderation_service),
    current_user: User = Depends(get_current_user),
):
    """Создать правило модерации (запрещённое слово)"""
    try:
        rule = await moderation_service.create_rule(
            channel_id=channel_id,
            data=data,
            owner_id=current_user.id,
        )
        return rule
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/{channel_id}/moderation/rules",
    response_model=ChannelModerationRuleListResponse,
)
async def list_moderation_rules(
    channel_id: int,
    moderation_service: ChannelModerationService = Depends(get_channel_moderation_service),
    current_user: User = Depends(get_current_user),
):
    """Получить список правил модерации"""
    try:
        rules = await moderation_service.list_rules(
            channel_id=channel_id,
            owner_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return ChannelModerationRuleListResponse(
        items=rules,
        total=len(rules),
    )


@router.put(
    "/{channel_id}/moderation/rules/{rule_id}",
    response_model=ChannelModerationRuleResponse,
)
async def update_moderation_rule(
    channel_id: int,
    rule_id: int,
    data: ChannelModerationRuleUpdate,
    moderation_service: ChannelModerationService = Depends(get_channel_moderation_service),
    current_user: User = Depends(get_current_user),
):
    """Обновить правило модерации"""
    rule = await moderation_service.update_rule(
        channel_id=channel_id,
        rule_id=rule_id,
        data=data,
        owner_id=current_user.id,
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete(
    "/{channel_id}/moderation/rules/{rule_id}",
    status_code=204,
)
async def delete_moderation_rule(
    channel_id: int,
    rule_id: int,
    moderation_service: ChannelModerationService = Depends(get_channel_moderation_service),
    current_user: User = Depends(get_current_user),
):
    """Удалить правило модерации"""
    success = await moderation_service.delete_rule(
        channel_id=channel_id,
        rule_id=rule_id,
        owner_id=current_user.id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")


# ============ Backup Jobs (Post-Factum Restore) ============

@router.post("/backup-jobs", response_model=BackupJobResponse, status_code=201)
async def create_backup_job(
    data: BackupJobCreate,
    background_tasks: BackgroundTasks,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Создать задачу на полное копирование канала (постфактум)"""
    try:
        job = await service.create_backup_job(data, owner_id=current_user.id)
        background_tasks.add_task(service.process_backup_job, job.id)
        return job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/backup-jobs", response_model=BackupJobListResponse)
async def list_backup_jobs(
    page: int = 1,
    page_size: int = 50,
    status: Optional[BackupStatus] = None,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Получить список задач бекапа"""
    jobs, total = await service.get_backup_jobs(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status
    )
    
    return BackupJobListResponse(
        items=jobs,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/backup-jobs/{job_id}", response_model=BackupJobResponse)
async def get_backup_job(
    job_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Получить информацию о задаче бекапа"""
    from sqlalchemy import select
    from backend.models.channels import BackupJob
    
    query = select(BackupJob).where(
        BackupJob.id == job_id,
        BackupJob.owner_id == current_user.id
    )
    result = await service.db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    
    return job


@router.post("/restore", response_model=RestoreBackupResponse)
async def restore_backup(
    data: RestoreBackupRequest,
    background_tasks: BackgroundTasks,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Восстановить посты из бекапа в новый канал"""
    try:
        job_data = BackupJobCreate(
            source_channel_id=data.source_channel_id,
            target_channel_id=data.target_channel_id
        )
        job = await service.create_backup_job(job_data, owner_id=current_user.id)
        background_tasks.add_task(service.process_backup_job, job.id)
        
        return RestoreBackupResponse(
            success=True,
            job_id=job.id,
            message="Backup restore started in background"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ Telegram Settings Management ============

@router.put("/{channel_id}/telegram-settings", response_model=ChannelGroupResponse)
async def update_channel_telegram_settings(
    channel_id: int,
    data: ChannelTelegramUpdate,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """
    Обновить настройки канала через Telegram API
    
    Позволяет изменить:
    - title: название канала (setChatTitle)
    - description: описание канала (setChatDescription)
    - photo_file_path: фото канала (setChatPhoto) - URL или локальный путь
    """
    try:
        channel = await service.update_channel_telegram_settings(
            channel_id=channel_id,
            owner_id=current_user.id,
            title=data.title,
            description=data.description,
            photo_file_path=data.photo_file_path
        )
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


@router.delete("/{channel_id}/telegram-photo", response_model=ChannelGroupResponse)
async def delete_channel_telegram_photo(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Удалить фото канала через Telegram API (deleteChatPhoto)"""
    try:
        channel = await service.delete_channel_photo(
            channel_id=channel_id,
            owner_id=current_user.id
        )
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{channel_id}/permissions", response_model=ChannelGroupResponse)
async def set_channel_telegram_permissions(
    channel_id: int,
    data: ChannelPermissionsUpdate,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """
    Установить разрешения для канала через Telegram API (setChatPermissions)
    
    Принимает объект с полями ChatPermissions:
    - can_send_messages
    - can_send_audios
    - can_send_documents
    - can_send_photos
    - can_send_videos
    - can_send_video_notes
    - can_send_voice_notes
    - can_send_polls
    - can_send_other_messages
    - can_add_web_page_previews
    - can_change_info
    - can_invite_users
    - can_pin_messages
    - can_manage_topics
    """
    try:
        permissions = data.model_dump(exclude_none=True)
        if not permissions:
            raise ValueError("No permissions provided")

        channel = await service.set_channel_permissions(
            channel_id=channel_id,
            owner_id=current_user.id,
            permissions=permissions
        )
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{channel_id}/pin-message", response_model=ChannelGroupResponse)
async def pin_message_in_channel(
    channel_id: int,
    message_id: int = Query(..., description="ID сообщения для закрепления"),
    disable_notification: bool = Query(False, description="Отправить уведомление без звука"),
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Закрепить сообщение в канале (pinChatMessage)"""
    try:
        channel = await service.pin_channel_message(
            channel_id=channel_id,
            owner_id=current_user.id,
            message_id=message_id,
            disable_notification=disable_notification
        )
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{channel_id}/unpin-message", response_model=ChannelGroupResponse)
async def unpin_message_in_channel(
    channel_id: int,
    message_id: Optional[int] = Query(None, description="ID сообщения для открепления. Если не указан - открепит все"),
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Открепить сообщение в канале (unpinChatMessage / unpinAllChatMessages)"""
    try:
        channel = await service.unpin_channel_message(
            channel_id=channel_id,
            owner_id=current_user.id,
            message_id=message_id
        )
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ Channel CRUD by ID ============

@router.get("/{channel_id}", response_model=ChannelGroupResponse)
async def get_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Получить информацию о канале"""
    channel = await service.get_channel(channel_id, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.put("/{channel_id}", response_model=ChannelGroupResponse)
async def update_channel(
    channel_id: int,
    data: ChannelGroupUpdate,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Обновить информацию о канале"""
    channel = await service.update_channel(channel_id, data, owner_id=current_user.id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service),
    current_user: User = Depends(get_current_user)
):
    """Удалить канал"""
    success = await service.delete_channel(channel_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"success": True, "message": "Channel deleted successfully"}
