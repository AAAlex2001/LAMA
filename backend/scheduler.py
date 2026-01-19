from datetime import datetime, timedelta, timezone
import logging

from sqlalchemy import select, or_, func, case
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import pytz

from backend.models.publications import Publication, PublicationStatus as DBPublicationStatus, RepeatInterval as DBRepeatInterval
from backend.services.publications import PublicationService
from backend.services.bot.triggers import TriggerService
from backend.services.bot.recurring_messages import RecurringMessageService
from backend.tasks.channel_backup import process_instant_backups
from backend.tasks.bot_polling import process_bot_updates
from backend.database import AsyncSessionLocal
from backend.config import OPENAI_API_KEY, get_bot


logger = logging.getLogger(__name__)
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

        delete_delay = case(
            (Publication.auto_delete_seconds.isnot(None), Publication.auto_delete_seconds),
            else_=Publication.auto_delete_hours * 3600
        )
        
        query = select(Publication).where(
            Publication.status == DBPublicationStatus.PUBLISHED,
            Publication.published_time.isnot(None),
            or_(
                Publication.auto_delete_hours.isnot(None),
                Publication.auto_delete_seconds.isnot(None)
            ),
            Publication.published_time + func.make_interval(secs=delete_delay) <= now
        ).limit(50)
        
        result = await db.execute(query)
        publications = result.scalars().all()
        
        logger.info(f"Found {len(publications)} publications to auto-delete")

        for publication in publications:
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
                    logger.error(f"Failed to execute scheduled trigger task {task.id}: {e}")
        except Exception as e:
            logger.error(f"Failed to process scheduled triggers: {e}")


async def process_recurring_messages():
    """Обработка повторяющихся сообщений"""
    async with AsyncSessionLocal() as db:
        service = RecurringMessageService(db)
        telegram_bot = get_bot()
        
        try:
            pending = await service.get_pending(limit=50)
            
            for msg in pending:
                try:
                    await service.send_message(msg, telegram_bot)
                except Exception as e:
                    logger.error(f"Failed to send recurring message {msg.id}: {e}")
        except Exception as e:
            logger.error(f"Failed to process recurring messages: {e}")


async def process_repeating_publications():
    """Обработка повторяющихся публикаций (DAILY, WEEKLY, etc.)"""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        
        query = select(Publication).where(
            Publication.status.in_([DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]),
            Publication.repeat_interval != DBRepeatInterval.NEVER,
            Publication.next_repeat_time.isnot(None),
            Publication.next_repeat_time <= now
        ).limit(50)
        
        result = await db.execute(query)
        publications = result.scalars().all()
        
        logger.info(f"Found {len(publications)} repeating publications to process")
        
        for publication in publications:
            service = PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
            try:
                result = await service.republish(publication.id)
                if result.get("success"):
                    logger.info(f"Successfully republished publication {publication.id}")
                else:
                    logger.warning(f"Failed to republish publication {publication.id}: {result.get('error')}")
            except Exception as e:
                logger.error(f"Failed to republish publication {publication.id}: {e}")
                base_time = publication.next_repeat_time or datetime.now(timezone.utc)
                publication.next_repeat_time = PublicationService.calculate_next_repeat_time(
                    base_time,
                    publication.repeat_interval,
                    publication.repeat_custom_days,
                    publication.repeat_custom_hours
                )
                await db.commit()


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
        trigger=IntervalTrigger(seconds=30),
        id="process_auto_delete",
        name="Process auto-delete every 30 seconds",
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

    scheduler.add_job(
        process_recurring_messages,
        trigger=IntervalTrigger(minutes=1),
        id="process_recurring_messages",
        name="Process recurring messages every 1 minute",
        replace_existing=True
    )

    scheduler.add_job(
        process_repeating_publications,
        trigger=IntervalTrigger(seconds=30),
        id="process_repeating_publications",
        name="Process repeating publications (DAILY, WEEKLY, etc.) every 30 seconds",
        replace_existing=True
    )

    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()


