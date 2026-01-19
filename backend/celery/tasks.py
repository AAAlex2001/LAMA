"""Celery-задачи для фоновой обработки и периодических запусков."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import Task
from sqlalchemy import case, func, or_, select

from backend.celery.app import celery_app
from backend.celery.async_runner import run
from backend.config import OPENAI_API_KEY, get_bot
from backend.database import AsyncSessionLocal
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)

logger = logging.getLogger(__name__)


class RetriableTask(Task):
    """Базовый класс задач с безопасными настройками ретраев."""

    autoretry_for = (Exception,)
    retry_backoff = True
    retry_backoff_max = 60
    retry_jitter = True
    default_retry_delay = 5
    max_retries = 3


@celery_app.task(name="backend.celery.tasks.publish_publication", base=RetriableTask)
def publish_publication(publication_id: int) -> str:
    """Опубликовать одну публикацию."""

    return run(publish_publication_async(publication_id))


async def publish_publication_async(publication_id: int) -> str:
    """Async-реализация публикации одной записи."""

    from backend.services.publications import PublicationService

    async with AsyncSessionLocal() as db:
        service = PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
        await service.publish_now(publication_id)
        return f"published:{publication_id}"


@celery_app.task(name="backend.celery.tasks.delete_publication_messages", base=RetriableTask)
def delete_publication_messages(publication_id: int) -> str:
    """Удалить Telegram-сообщения, связанные с публикацией."""

    return run(delete_publication_messages_async(publication_id))


async def delete_publication_messages_async(publication_id: int) -> str:
    """Async-реализация удаления Telegram-сообщений публикации."""

    from backend.services.publications import PublicationService

    async with AsyncSessionLocal() as db:
        service = PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
        await service.delete_telegram_messages(publication_id)
        return f"deleted_messages:{publication_id}"


@celery_app.task(name="backend.celery.tasks.republish_publication", base=RetriableTask)
def republish_publication(publication_id: int) -> str:
    """Переопубликовать публикацию согласно настройкам повторов."""

    return run(republish_publication_async(publication_id))


async def republish_publication_async(publication_id: int) -> str:
    """Async-реализация переопубликации."""

    from backend.services.publications import PublicationService

    async with AsyncSessionLocal() as db:
        service = PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
        await service.republish(publication_id)
        return f"republished:{publication_id}"


@celery_app.task(name="backend.celery.tasks.process_scheduled_publications")
def process_scheduled_publications() -> str:
    """Найти публикации, которые пора публиковать, и поставить их в очередь."""

    return run(process_scheduled_publications_async())


async def process_scheduled_publications_async() -> str:
    """Async-реализация постановки запланированных публикаций в очередь."""

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        query = select(Publication.id).where(
            Publication.status == DBPublicationStatus.SCHEDULED,
            Publication.scheduled_time <= now,
        )
        result = await db.execute(query)
        ids = list(result.scalars().all())

    for publication_id in ids:
        publish_publication.apply_async(args=[publication_id], queue="high")

    return f"queued_publish:{len(ids)}"


@celery_app.task(name="backend.celery.tasks.process_auto_delete")
def process_auto_delete() -> str:
    """Найти публикации для автоудаления и поставить удаление в очередь."""

    return run(process_auto_delete_async())


async def process_auto_delete_async() -> str:
    """Async-реализация постановки задач автоудаления в очередь."""

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        delete_delay = case(
            (Publication.auto_delete_seconds.isnot(None), Publication.auto_delete_seconds),
            else_=Publication.auto_delete_hours * 3600,
        )

        query = (
            select(Publication.id)
            .where(
                Publication.status == DBPublicationStatus.PUBLISHED,
                Publication.published_time.isnot(None),
                or_(
                    Publication.auto_delete_hours.isnot(None),
                    Publication.auto_delete_seconds.isnot(None),
                ),
                Publication.published_time
                + func.make_interval(0, 0, 0, 0, 0, 0, delete_delay)
                <= now,
            )
            .limit(50)
        )

        result = await db.execute(query)
        ids = list(result.scalars().all())

    for publication_id in ids:
        delete_publication_messages.apply_async(args=[publication_id], queue="default")

    return f"queued_delete:{len(ids)}"


@celery_app.task(name="backend.celery.tasks.process_scheduled_triggers")
def process_scheduled_triggers() -> str:
    """Выполнить отложенные задачи триггеров."""

    return run(process_scheduled_triggers_async())


async def process_scheduled_triggers_async() -> str:
    """Async-реализация выполнения задач триггеров."""

    from backend.services.bot.triggers import TriggerService

    async with AsyncSessionLocal() as db:
        service = TriggerService(db)
        telegram_bot = get_bot()
        tasks = await service.get_pending_tasks(limit=50)
        for task in tasks:
            try:
                await service.execute_scheduled_task(task, telegram_bot)
            except Exception as exc:
                logger.error("trigger_task_failed: %s", exc)
        return f"processed_triggers:{len(tasks)}"


@celery_app.task(name="backend.celery.tasks.process_recurring_messages")
def process_recurring_messages() -> str:
    """Отправить ожидающие повторяющиеся сообщения."""

    return run(process_recurring_messages_async())


async def process_recurring_messages_async() -> str:
    """Async-реализация отправки повторяющихся сообщений."""

    from backend.services.bot.recurring_messages import RecurringMessageService

    async with AsyncSessionLocal() as db:
        service = RecurringMessageService(db)
        telegram_bot = get_bot()
        pending = await service.get_pending(limit=50)
        for msg in pending:
            try:
                await service.send_message(msg, telegram_bot)
            except Exception as exc:
                logger.error("recurring_message_failed: %s", exc)
        return f"processed_recurring:{len(pending)}"


@celery_app.task(name="backend.celery.tasks.process_repeating_publications")
def process_repeating_publications() -> str:
    """Найти повторяющиеся публикации, которые пора переопубликовать, и поставить их в очередь."""

    return run(process_repeating_publications_async())


async def process_repeating_publications_async() -> str:
    """Async-реализация постановки задач переопубликации в очередь."""

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        query = (
            select(Publication.id)
            .where(
                Publication.status.in_(
                    [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]
                ),
                Publication.repeat_interval != DBRepeatInterval.NEVER,
                Publication.next_repeat_time.isnot(None),
                Publication.next_repeat_time <= now,
            )
            .limit(50)
        )
        result = await db.execute(query)
        ids = list(result.scalars().all())

    for publication_id in ids:
        republish_publication.apply_async(args=[publication_id], queue="default")

    return f"queued_republish:{len(ids)}"


@celery_app.task(name="backend.celery.tasks.process_bot_updates")
def process_bot_updates() -> str:
    """Обработать обновления ботов в режиме polling."""

    return run(process_bot_updates_async())


async def process_bot_updates_async() -> str:
    """Async-реализация обработки обновлений ботов."""

    from backend.tasks.bot_polling import process_bot_updates as polling

    await polling()
    return "bot_updates_ok"


@celery_app.task(name="backend.celery.tasks.process_instant_backups")
def process_instant_backups() -> str:
    """Запустить задачу мгновенных бекапов."""

    return run(process_instant_backups_async())


async def process_instant_backups_async() -> str:
    """Async-реализация мгновенных бекапов."""

    from backend.tasks.channel_backup import process_instant_backups as task

    await task()
    return "instant_backups_ok"
