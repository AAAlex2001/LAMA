from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from backend.database import get_db
from backend.config import get_bot
from backend.services.channels import ChannelService
from backend.schemas.channels import (
    ChannelGroupCreate, ChannelGroupUpdate, ChannelGroupResponse, ChannelGroupListResponse,
    SyncChannelRequest, SyncChannelResponse,
    BackupModeUpdateRequest, BackedUpPostListResponse, BackupJobCreate, BackupJobResponse,
    BackupJobListResponse, RestoreBackupRequest, RestoreBackupResponse, ChannelStatsResponse,
    ChannelType, BackupMode, BackupStatus
)
from backend.models.channels import ChannelGroup


router = APIRouter(prefix="/channels", tags=["channels"])


async def get_channel_service(db: AsyncSession = Depends(get_db)):
    bot = get_bot()
    return ChannelService(db, bot)


# ============ CRUD Operations ============

@router.post("", response_model=ChannelGroupResponse, status_code=201)
async def create_channel(
    data: ChannelGroupCreate,
    service: ChannelService = Depends(get_channel_service)
):
    """Создать канал/группу вручную"""
    channel = await service.create_channel(data)
    return channel


@router.get("", response_model=ChannelGroupListResponse)
async def list_channels(
    page: int = 1,
    page_size: int = 50,
    channel_type: Optional[ChannelType] = None,
    is_active: Optional[bool] = None,
    backup_mode: Optional[BackupMode] = None,
    service: ChannelService = Depends(get_channel_service)
):
    """Получить список каналов с фильтрацией"""
    channels, total = await service.list_channels(
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


@router.get("/{channel_id}", response_model=ChannelGroupResponse)
async def get_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service)
):
    """Получить информацию о канале"""
    channel = await service.get_channel(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.put("/{channel_id}", response_model=ChannelGroupResponse)
async def update_channel(
    channel_id: int,
    data: ChannelGroupUpdate,
    service: ChannelService = Depends(get_channel_service)
):
    """Обновить информацию о канале"""
    channel = await service.update_channel(channel_id, data)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    service: ChannelService = Depends(get_channel_service)
):
    """Удалить канал"""
    success = await service.delete_channel(channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"success": True, "message": "Channel deleted successfully"}


# ============ Telegram Sync ============

@router.post("/sync", response_model=SyncChannelResponse)
async def sync_channel(
    data: SyncChannelRequest,
    service: ChannelService = Depends(get_channel_service)
):
    """Синхронизировать канал/группу через Telegram API"""
    try:
        channel = await service.sync_channel_from_telegram(data.telegram_id)
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
    service: ChannelService = Depends(get_channel_service)
):
    """Обновить информацию существующего канала через Telegram API"""
    channel = await service.get_channel(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    try:
        updated_channel = await service.sync_channel_from_telegram(channel.telegram_id)
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
    service: ChannelService = Depends(get_channel_service)
):
    """Настроить режим бекапа для канала"""
    try:
        channel = await service.update_backup_mode(
            channel_id=channel_id,
            backup_mode=data.backup_mode,
            backup_target_id=data.backup_target_id
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
    service: ChannelService = Depends(get_channel_service)
):
    """Получить список бекапнутых постов канала"""
    channel = await service.get_channel(channel_id)
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
    service: ChannelService = Depends(get_channel_service)
):
    """Получить статистику по каналу"""
    channel = await service.get_channel(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    stats = await service.get_channel_stats(channel_id)
    return ChannelStatsResponse(**stats)


# ============ Backup Jobs (Post-Factum Restore) ============

@router.post("/backup-jobs", response_model=BackupJobResponse, status_code=201)
async def create_backup_job(
    data: BackupJobCreate,
    background_tasks: BackgroundTasks,
    service: ChannelService = Depends(get_channel_service)
):
    """Создать задачу на полное копирование канала (постфактум)"""
    try:
        job = await service.create_backup_job(data)
        background_tasks.add_task(service.process_backup_job, job.id)
        return job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/backup-jobs", response_model=BackupJobListResponse)
async def list_backup_jobs(
    page: int = 1,
    page_size: int = 50,
    status: Optional[BackupStatus] = None,
    service: ChannelService = Depends(get_channel_service)
):
    """Получить список задач бекапа"""
    jobs, total = await service.get_backup_jobs(
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
    service: ChannelService = Depends(get_channel_service)
):
    """Получить информацию о задаче бекапа"""
    from sqlalchemy import select
    from backend.models.channels import BackupJob
    
    query = select(BackupJob).where(BackupJob.id == job_id)
    result = await service.db.execute(query)
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Backup job not found")
    
    return job


@router.post("/restore", response_model=RestoreBackupResponse)
async def restore_backup(
    data: RestoreBackupRequest,
    background_tasks: BackgroundTasks,
    service: ChannelService = Depends(get_channel_service)
):
    """Восстановить посты из бекапа в новый канал"""
    try:
        job_data = BackupJobCreate(
            source_channel_id=data.source_channel_id,
            target_channel_id=data.target_channel_id
        )
        job = await service.create_backup_job(job_data)
        background_tasks.add_task(service.process_backup_job, job.id)
        
        return RestoreBackupResponse(
            success=True,
            job_id=job.id,
            message="Backup restore started in background"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

