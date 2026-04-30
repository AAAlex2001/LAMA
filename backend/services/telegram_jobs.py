"""Post-commit Celery job queue for Telegram side effects."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.app import celery_app
from backend.services.rate_limiter import get_redis_client

logger = logging.getLogger(__name__)

SESSION_KEY = "after_commit_celery_jobs"


@dataclass(frozen=True, slots=True)
class CeleryJob:
    task_name: str
    args: tuple[Any, ...] = ()
    kwargs: dict[str, Any] = field(default_factory=dict)
    queue: str = "telegram"
    countdown: int | None = None
    idempotency_key: str | None = None
    idempotency_ttl_seconds: int = 900


def enqueue_after_commit(db: AsyncSession, job: CeleryJob) -> None:
    jobs = db.info.setdefault(SESSION_KEY, [])
    jobs.append(job)


def collect_after_commit_jobs(db: AsyncSession) -> list[CeleryJob]:
    return list(db.info.get(SESSION_KEY, []))


async def dispatch_after_commit_jobs(jobs: list[CeleryJob]) -> None:
    for job in jobs:
        if job.idempotency_key and not await claim_job(job):
            logger.debug("Skipped duplicate Telegram job: %s", job.idempotency_key)
            continue

        options: dict[str, Any] = {"queue": job.queue}
        if job.countdown is not None:
            options["countdown"] = job.countdown

        celery_app.send_task(
            job.task_name,
            args=list(job.args),
            kwargs=job.kwargs,
            **options,
        )


async def claim_job(job: CeleryJob) -> bool:
    client = get_redis_client()
    claimed = await client.set(
        job.idempotency_key,
        "1",
        nx=True,
        ex=job.idempotency_ttl_seconds,
    )
    return bool(claimed)
