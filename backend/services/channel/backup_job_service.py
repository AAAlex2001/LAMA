from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost, BackupJob, BackupStatus
from backend.schemas.channels import BackupJobCreate
from backend.services.channel.retransmit_service import RetransmitService
from backend.services.channel.utils.bot_utils import get_master_bot
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
        if not source or not target:
            raise ValueError("Source or target channel not found")

        total_posts = await self.count_posts(data.source_channel_id)

        job = BackupJob(
            owner_id=owner_id,
            source_channel_id=data.source_channel_id,
            target_channel_id=data.target_channel_id,
            status=BackupStatus.IN_PROGRESS,
            total_posts=total_posts,
            processed_posts=0,
            failed_posts=0,
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def process(self, job_id: int) -> BackupJob:
        """Обработать задачу бекапа."""
        query = select(BackupJob).where(BackupJob.id == job_id)
        result = await self.db.execute(query)
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError("Backup job not found")
        if job.status != BackupStatus.IN_PROGRESS:
            return job

        posts = await self.get_source_posts(job.source_channel_id)
        job.total_posts = len(posts)
        await self.db.commit()

        target_channel = await get_channel(self.db, job.target_channel_id)
        if not target_channel:
            raise ValueError("Target channel not found")

        bot = get_master_bot()
        retransmit = RetransmitService(self.db)

        for post in posts:
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

            if job.processed_posts % COMMIT_BATCH_SIZE == 0:
                await self.db.commit()

        if job.failed_posts == 0:
            job.status = BackupStatus.COMPLETED
        elif job.processed_posts > 0:
            job.status = BackupStatus.ACTIVE
        else:
            job.status = BackupStatus.FAILED

        job.completed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(job)
        return job

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

    async def count_posts(self, channel_id: int) -> int:
        """Подсчитать посты канала."""
        result = await self.db.execute(
            select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)
        )
        return result.scalar() or 0

    async def get_source_posts(self, channel_id: int) -> List[BackedUpPost]:
        """Получить все посты канала для обработки."""
        query = (
            select(BackedUpPost)
            .where(BackedUpPost.channel_id == channel_id)
            .order_by(BackedUpPost.original_date.asc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
