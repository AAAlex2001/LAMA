from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost, BackupJob, BackupStatus
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.features.backup_jobs.post_filter import count_posts, pick_post_at
from backend.services.channel.features.retransmit.retransmit_post import RetransmitPost
from backend.services.channel.utils.query_utils import get_channel


class ProcessBackupJob:
    """Обрабатывает один пост из задачи бекапа за один вызов."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, job_id: int) -> bool:
        """True если задача ещё не завершена и есть посты для обработки."""
        job = (await self.db.execute(
            select(BackupJob).where(BackupJob.id == job_id)
        )).scalar_one_or_none()
        if job is None:
            raise ValueError(f"Backup job {job_id} not found")
        if job.status != BackupStatus.IN_PROGRESS:
            return False

        offset = job.processed_posts + job.failed_posts
        post = await pick_post_at(
            self.db, job.source_channel_id, job.content_types,
            job.filter_start_date, job.filter_end_date, offset,
        )

        if post is None:
            finalize_job(job)
            await self.db.flush()
            return False

        if offset == 0:
            job.total_posts = await count_posts(
                self.db, job.source_channel_id, job.content_types,
                job.filter_start_date, job.filter_end_date,
            )
            await self.db.flush()

        target = await get_channel(self.db, job.target_channel_id, job.owner_id)
        if target is None:
            raise ValueError(f"Target channel {job.target_channel_id} not found")

        bot = await resolve_for_channel(self.db, target)
        await retransmit_or_record_failure(self.db, job, post, target, bot)
        await self.db.flush()

        next_post = await pick_post_at(
            self.db, job.source_channel_id, job.content_types,
            job.filter_start_date, job.filter_end_date, offset + 1,
        )
        if next_post is None:
            finalize_job(job)
            await self.db.flush()
            return False

        return True


def finalize_job(job: BackupJob) -> None:
    """Проставляет финальный статус и completed_at по итогам обработки."""
    if job.failed_posts == 0:
        job.status = BackupStatus.COMPLETED
    elif job.processed_posts > 0:
        job.status = BackupStatus.ACTIVE
    else:
        job.status = BackupStatus.FAILED
    job.completed_at = datetime.now(timezone.utc)


async def retransmit_or_record_failure(
    db: AsyncSession, job: BackupJob, post: BackedUpPost, target_channel, bot,
) -> None:
    """Ретранслирует пост; при ошибке инкрементит failed_posts и пишет в error_details."""
    try:
        await RetransmitPost(db).execute(
            post, job.target_channel_id, target_channel=target_channel, bot=bot,
        )
        job.processed_posts += 1
    except Exception as exc:
        job.failed_posts += 1
        if job.error_details is None:
            job.error_details = []
        job.error_details.append({
            "post_id": post.id,
            "error": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
