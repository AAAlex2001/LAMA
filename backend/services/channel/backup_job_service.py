from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost, BackupJob, BackupStatus
from backend.schemas.channels import BackupJobCreate
from backend.services.channel.retransmit_service import RetransmitService
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.query_utils import get_channel

COMMIT_BATCH_SIZE = 10


class BackupJobService:
    """Управление задачами бекапа."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: BackupJobCreate, owner_id: int) -> BackupJob:
        """Создать задачу бекапа."""
        source = await get_channel(self.db, data.source_channel_id, owner_id)
        target = await get_channel(self.db, data.target_channel_id, owner_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source channel not found")
        if not target:
            raise HTTPException(status_code=404, detail="Target channel not found")

        total_posts = await self.count_posts(
            data.source_channel_id,
            content_types=data.content_types,
            start_date=data.start_date,
            end_date=data.end_date,
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

    async def process(self, job_id: int) -> bool:
        """Обработать один пост. Возвращает True если есть ещё посты."""
        query = select(BackupJob).where(BackupJob.id == job_id)
        result = await self.db.execute(query)
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError(f"Backup job {job_id} not found")
        if job.status != BackupStatus.IN_PROGRESS:
            return False

        offset = job.processed_posts + job.failed_posts
        post_query = (
            select(BackedUpPost)
            .where(BackedUpPost.channel_id == job.source_channel_id)
        )
        if job.content_types:
            post_query = post_query.where(BackedUpPost.content_type.in_(job.content_types))
        if job.filter_start_date:
            post_query = post_query.where(BackedUpPost.original_date >= job.filter_start_date)
        if job.filter_end_date:
            post_query = post_query.where(BackedUpPost.original_date <= job.filter_end_date)
        post_query = post_query.order_by(BackedUpPost.original_date.asc()).offset(offset).limit(1)
        post = (await self.db.execute(post_query)).scalar_one_or_none()

        if not post:
            if job.failed_posts == 0:
                job.status = BackupStatus.COMPLETED
            elif job.processed_posts > 0:
                job.status = BackupStatus.ACTIVE
            else:
                job.status = BackupStatus.FAILED
            job.completed_at = datetime.now(timezone.utc)
            await self.db.flush()
            return False

        if offset == 0:
            job.total_posts = await self.count_posts(
                job.source_channel_id,
                content_types=job.content_types,
                start_date=job.filter_start_date,
                end_date=job.filter_end_date,
            )
            await self.db.flush()

        target_channel = await get_channel(self.db, job.target_channel_id, job.owner_id)
        if not target_channel:
            raise ValueError(f"Target channel {job.target_channel_id} not found")

        bot = await resolve_for_channel(self.db, target_channel)
        retransmit = RetransmitService(self.db)

        try:
            await retransmit.retransmit_post(post, job.target_channel_id, target_channel=target_channel, bot=bot)
            job.processed_posts += 1
        except Exception as e:
            job.failed_posts += 1
            if not job.error_details:
                job.error_details = []
            job.error_details.append({
                "post_id": post.id,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        await self.db.flush()

        next_query = (
            select(BackedUpPost.id)
            .where(BackedUpPost.channel_id == job.source_channel_id)
        )
        if job.content_types:
            next_query = next_query.where(BackedUpPost.content_type.in_(job.content_types))
        if job.filter_start_date:
            next_query = next_query.where(BackedUpPost.original_date >= job.filter_start_date)
        if job.filter_end_date:
            next_query = next_query.where(BackedUpPost.original_date <= job.filter_end_date)
        next_query = next_query.order_by(BackedUpPost.original_date.asc()).offset(offset + 1).limit(1)
        next_post = (await self.db.execute(next_query)).scalar_one_or_none()

        if not next_post:
            if job.failed_posts == 0:
                job.status = BackupStatus.COMPLETED
            elif job.processed_posts > 0:
                job.status = BackupStatus.ACTIVE
            else:
                job.status = BackupStatus.FAILED
            job.completed_at = datetime.now(timezone.utc)
            await self.db.flush()
            return False

        return True

    async def get_jobs(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        status: Optional[BackupStatus] = None,
    ) -> tuple[List[BackupJob], int]:
        """Получить список задач бекапа."""
        query = select(BackupJob).where(BackupJob.owner_id == owner_id)
        count_query = select(func.count(BackupJob.id)).where(BackupJob.owner_id == owner_id)

        if status:
            query = query.where(BackupJob.status == status)
            count_query = count_query.where(BackupJob.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(BackupJob.started_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        jobs = list(result.scalars().all())

        return jobs, total

    async def count_posts(
        self,
        channel_id: int,
        content_types: Optional[list] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Подсчитать посты канала с учётом фильтров."""
        query = select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)
        if content_types:
            query = query.where(BackedUpPost.content_type.in_(content_types))
        if start_date:
            query = query.where(BackedUpPost.original_date >= start_date)
        if end_date:
            query = query.where(BackedUpPost.original_date <= end_date)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_backup_job(self, job_id: int, owner_id: int) -> BackupJob:
        """Получить задачу бекапа по ID."""
        query = select(BackupJob).where(BackupJob.id == job_id, BackupJob.owner_id == owner_id)
        result = await self.db.execute(query)
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Backup job not found")
        return job

    async def get_source_posts(self, channel_id: int) -> List[BackedUpPost]:
        """Получить все посты канала для обработки."""
        query = (
            select(BackedUpPost)
            .where(BackedUpPost.channel_id == channel_id)
            .order_by(BackedUpPost.original_date.asc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
