from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from backend.models.auth import User
from backend.models.channels import BackupStatus
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
from backend.celery.tasks import process_backup_job

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
    await channel_service.get(channel_id, owner_id=current_user.id)
    posts, total = await backup_service.get_posts(channel_id=channel_id, page=page, page_size=page_size)
    return BackedUpPostListResponse(items=posts, total=total, page=page, page_size=page_size)


@router.get("/{channel_id}/stats", response_model=ChannelStatsResponse)
async def get_channel_stats(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    backup_service: BackupService = Depends(get_backup_service),
    current_user: User = Depends(get_current_user),
):
    await channel_service.get(channel_id, owner_id=current_user.id)
    stats = await backup_service.get_stats(channel_id)
    return ChannelStatsResponse(**stats)


@router.get("/{channel_id}/backup-day-counts")
async def get_backup_day_counts(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    backup_service: BackupService = Depends(get_backup_service),
    current_user: User = Depends(get_current_user),
):
    await channel_service.get(channel_id, owner_id=current_user.id)
    return await backup_service.get_day_counts(channel_id)


@router.post("/backup-jobs", response_model=BackupJobResponse, status_code=201)
async def create_backup_job(
    data: BackupJobCreate,
    service: BackupJobService = Depends(get_backup_job_service),
    current_user: User = Depends(get_current_user),
):
    job = await service.create(data, owner_id=current_user.id)
    process_backup_job.apply_async(args=[job.id], countdown=2)
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
    service: BackupJobService = Depends(get_backup_job_service),
    current_user: User = Depends(get_current_user),
):
    job_data = BackupJobCreate(
        source_channel_id=data.source_channel_id,
        target_channel_id=data.target_channel_id,
        content_types=data.content_types,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    job = await service.create(job_data, owner_id=current_user.id)
    process_backup_job.apply_async(args=[job.id], countdown=2)
    return RestoreBackupResponse(success=True, job_id=job.id, message="Восстановление запущено")


@router.get("/{channel_id}/export")
async def export_backed_up_posts(
    channel_id: int,
    channel_service: ChannelService = Depends(get_channel_service),
    backup_service: BackupService = Depends(get_backup_service),
    current_user: User = Depends(get_current_user),
):
    channel = await channel_service.get(channel_id, owner_id=current_user.id)
    posts, total = await backup_service.get_posts(channel_id=channel_id, page=1, page_size=5000)
    export_data = {
        "channel_id": channel_id,
        "channel_title": channel.title,
        "total_posts": total,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "posts": [
            {
                "id": p.id,
                "telegram_message_id": p.telegram_message_id,
                "content_type": p.content_type,
                "text_content": p.text_content,
                "media_file_ids": p.media_file_ids,
                "views_count": p.views_count,
                "forwards_count": p.forwards_count,
                "original_date": p.original_date.isoformat() if p.original_date else None,
                "backed_up_at": p.backed_up_at.isoformat() if p.backed_up_at else None,
                "raw_data": p.raw_data,
            }
            for p in posts
        ],
    }
    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": f'attachment; filename="backup_{channel_id}.json"'},
    )
