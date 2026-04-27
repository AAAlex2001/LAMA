from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackupJob, BackupStatus


class ListBackupJobs:
    """Постраничный список задач бекапа пользователя."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        status: Optional[BackupStatus] = None,
    ) -> tuple[list[BackupJob], int]:
        """Возвращает (задачи текущей страницы, общее число)."""
        filters = [BackupJob.owner_id == owner_id]
        if status is not None:
            filters.append(BackupJob.status == status)

        total = (await self.db.execute(
            select(func.count(BackupJob.id)).where(*filters)
        )).scalar() or 0

        page_query = (
            select(BackupJob)
            .where(*filters)
            .order_by(BackupJob.started_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        jobs = list((await self.db.execute(page_query)).scalars().all())
        return jobs, total
