from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select

from backend.models.auth import User
from backend.models.channels import BackupJob, BackupStatus
from backend.routes.auth import get_current_user
from backend.routes.channels.dependencies import get_backup_job_service, get_backup_service, get_channel_service
from backend.schemas.channels import (
    BackedUpPostListResponse,
    BackupJobCreate,
    BackupJobListResponse,
    BackupJobResponse,
    BackupModeUpdateRequest,
    ChannelGroupResponse,
    ChannelStatsResponse,
    RestoreBackupRequest,
    RestoreBackupResponse,
)
from backend.services.channel.backup_job_service import BackupJobService
from backend.services.channel.backup_service import BackupService
from backend.services.channel.channel_service import ChannelService

router = APIRouter()


@router.post("/{channel_id}/backup-mode", response_model=ChannelGroupResponse)
async def update_backup_mode(
    channel_id: int,
    data: BackupModeUpdateRequest,
    service: BackupService = Depends(get_backup_service),
    current_user: User = Depends(get_current_user),
):
    channel = await service.update_mode(
        channel_id=channel_id,
        backup_mode=data.backup_mode,
        backup_target_ids=data.backup_target_ids,
        backup_post_types=data.backup_post_types,
        backup_content_types=data.backup_content_types,
        backup_ai_prompt=data.backup_ai_prompt,
        owner_id=current_user.id,
    )
    return channel


@router.get("/{channel_id}/backed-posts", response_model=BackedUpPostListResponse)
async def get_backed_up_posts(
    channel_id: int,
    page: int = 1,
    page_size: int = 50,
    channel_service: ChannelService = Depends(get_channel_service),
    backup_service: BackupService = Depends(get_backup_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)

    posts, total = await backup_service.get_posts(channel_id=channel_id, page=page, page_size=page_size)
    return BackedUpPostListResponse(items=posts, total=total, page=page, page_size=page_size)


@router.get("/{channel_id}/stats", response_model=ChannelStatsResponse)
async def get_channel_stats(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    backup_service: BackupService = Depends(get_backup_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)

    stats = await backup_service.get_stats(channel_id)
    return ChannelStatsResponse(**stats)


@router.post("/backup-jobs", response_model=BackupJobResponse, status_code=201)
async def create_backup_job(
    data: BackupJobCreate,
    background_tasks: BackgroundTasks,
    service: BackupJobService = Depends(get_backup_job_service),
    current_user: User = Depends(get_current_user),
):
    job = await service.create(data, owner_id=current_user.id)
    background_tasks.add_task(service.process, job.id)
    return job


@router.get("/backup-jobs", response_model=BackupJobListResponse)
async def list_backup_jobs(
    page: int = 1,
    page_size: int = 50,
    status: Optional[BackupStatus] = None,
    service: BackupJobService = Depends(get_backup_job_service),
    current_user: User = Depends(get_current_user),
):
    jobs, total = await service.get_jobs(
        owner_id=current_user.id,
        page=page,
        page_size=page_size,
        status=status,
    )
    return BackupJobListResponse(items=jobs, total=total, page=page, page_size=page_size)


@router.get("/backup-jobs/{job_id}", response_model=BackupJobResponse)
async def get_backup_job(
    job_id: int,
    service: BackupJobService = Depends(get_backup_job_service),
    current_user: User = Depends(get_current_user),
):
    return await service.get_backup_job(job_id=job_id, owner_id=current_user.id)


@router.post("/restore", response_model=RestoreBackupResponse)
async def restore_backup(
    data: RestoreBackupRequest,
    background_tasks: BackgroundTasks,
    service: BackupJobService = Depends(get_backup_job_service),
    current_user: User = Depends(get_current_user),
):
    job_data = BackupJobCreate(
        source_channel_id=data.source_channel_id,
        target_channel_id=data.target_channel_id,
    )
    job = await service.create(job_data, owner_id=current_user.id)
    background_tasks.add_task(service.process, job.id)
    return RestoreBackupResponse(success=True, job_id=job.id, message="Backup restore started in background")
