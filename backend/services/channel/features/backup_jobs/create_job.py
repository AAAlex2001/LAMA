from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackupJob, BackupStatus
from backend.schemas.channels.backup import BackupJobCreate
from backend.services.channel.features.backup_jobs.post_filter import count_posts
from backend.services.channel.utils.query_utils import get_channel


class CreateBackupJob:
    """Создаёт задачу бекапа из канала-источника в канал-приёмник."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, data: BackupJobCreate, owner_id: int) -> BackupJob:
        """Бросает 404 если источник или приёмник не найдены у пользователя."""
        source = await get_channel(self.db, data.source_channel_id, owner_id)
        if source is None:
            raise HTTPException(status_code=404, detail="Source channel not found")
        target = await get_channel(self.db, data.target_channel_id, owner_id)
        if target is None:
            raise HTTPException(status_code=404, detail="Target channel not found")

        total_posts = await count_posts(
            self.db, data.source_channel_id, data.content_types, data.start_date, data.end_date,
        )

        job = BackupJob(
            owner_id=owner_id,
            source_channel_id=data.source_channel_id,
            target_channel_id=data.target_channel_id,
            content_types=data.content_types,
            filter_start_date=data.start_date,
            filter_end_date=data.end_date,
            status=BackupStatus.IN_PROGRESS,
            total_posts=total_posts,
            processed_posts=0,
            failed_posts=0,
        )
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return job
