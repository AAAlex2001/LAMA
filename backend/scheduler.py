from datetime import datetime, timedelta, timezone

from sqlalchemy import select, or_
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import pytz

from backend.models.publications import Publication, PublicationStatus as DBPublicationStatus
from backend.services.publications import PublicationService
from backend.services.bot.triggers import TriggerService
from backend.tasks.channel_backup import process_instant_backups
from backend.tasks.bot_polling import process_bot_updates
from backend.database import AsyncSessionLocal
from backend.config import OPENAI_API_KEY, get_bot


scheduler = AsyncIOScheduler(timezone=pytz.UTC)


async def process_scheduled_publications():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        
        query = select(Publication).where(
            Publication.status == DBPublicationStatus.SCHEDULED,
            Publication.scheduled_time <= now
        )
        result = await db.execute(query)
        publications = result.scalars().all()
        
        for publication in publications:
            service = PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
            try:
                await service.publish_now(publication.id)
            except Exception as e:
                await service.create_notification(
                    publication.id,
                    "error",
                    f"Failed to publish scheduled publication: {str(e)}",
                    {"error": str(e)}
                )


async def process_auto_delete():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        query = select(Publication).where(
            Publication.status == DBPublicationStatus.PUBLISHED,
            Publication.published_time.isnot(None),
            or_(
            Publication.auto_delete_hours.isnot(None),
                Publication.auto_delete_seconds.isnot(None)
            )
        )
        result = await db.execute(query)
        publications = result.scalars().all()

        for publication in publications:
            if not publication.published_time:
                continue

            delete_delay_seconds = None
            if publication.auto_delete_seconds:
                delete_delay_seconds = publication.auto_delete_seconds
            elif publication.auto_delete_hours:
                delete_delay_seconds = publication.auto_delete_hours * 3600

            if delete_delay_seconds is None:
                continue

            delete_time = publication.published_time + timedelta(seconds=delete_delay_seconds)

            if now >= delete_time:
                service = PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
                try:
                    await service.delete_telegram_messages(publication.id)
                except Exception as e:
                    await service.create_notification(
                        publication.id,
                        "error",
                        f"Failed to auto-delete publication: {str(e)}",
                        {"error": str(e)}
                    )


async def process_scheduled_triggers():
    """Обработка отложенных триггеров"""
    async with AsyncSessionLocal() as db:
        trigger_service = TriggerService(db)
        telegram_bot = get_bot()

        try:
            tasks = await trigger_service.get_pending_tasks(limit=50)

            for task in tasks:
                try:
                    await trigger_service.execute_scheduled_task(task, telegram_bot)
                except Exception as e:
                    print(f"Failed to execute scheduled trigger task {task.id}: {e}")
        finally:
            await telegram_bot.session.close()


def start_scheduler():
    scheduler.add_job(
        process_scheduled_publications,
        trigger=IntervalTrigger(seconds=30),
        id="process_scheduled_publications",
        name="Process scheduled publications every 30 seconds",
        replace_existing=True
    )
    
    scheduler.add_job(
        process_auto_delete,
        trigger=IntervalTrigger(minutes=5),
        id="process_auto_delete",
        name="Process auto-delete every 5 minutes",
        replace_existing=True
    )
    
    scheduler.add_job(
        process_instant_backups,
        trigger=IntervalTrigger(minutes=2),
        id="process_instant_backups",
        name="Process instant channel backups every 2 minutes",
        replace_existing=True
    )
    
    scheduler.add_job(
        process_bot_updates,
        trigger=IntervalTrigger(seconds=3),
        id="process_bot_updates",
        name="Process bot updates every 3 seconds (real-time messaging)",
        replace_existing=True
    )

    scheduler.add_job(
        process_scheduled_triggers,
        trigger=IntervalTrigger(seconds=30),
        id="process_scheduled_triggers",
        name="Process scheduled trigger tasks every 30 seconds",
        replace_existing=True
    )

    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()


