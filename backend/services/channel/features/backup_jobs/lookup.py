from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackupJob


async def find_backup_job_or_404(db: AsyncSession, job_id: int, owner_id: int) -> BackupJob:
    """Возвращает задачу бекапа пользователя или бросает 404."""
    job = (await db.execute(
        select(BackupJob).where(BackupJob.id == job_id, BackupJob.owner_id == owner_id)
    )).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Backup job not found")
    return job
