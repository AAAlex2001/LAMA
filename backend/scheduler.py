from datetime import datetime, timedelta

from sqlalchemy import select
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import pytz

from backend.models.publications import Publication, PublicationStatus as DBPublicationStatus
from backend.services.publications import PublicationService
from backend.tasks.channel_backup import process_instant_backups
from backend.database import AsyncSessionLocal
from backend.config import bot, OPENAI_API_KEY


scheduler = AsyncIOScheduler(timezone=pytz.UTC)


async def process_scheduled_publications():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        
        query = select(Publication).where(
            Publication.status == DBPublicationStatus.SCHEDULED,
            Publication.scheduled_time <= now
        )
        result = await db.execute(query)
        publications = result.scalars().all()
        
        for publication in publications:
            service = PublicationService(db=db, bot=bot, openai_api_key=OPENAI_API_KEY)
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
        now = datetime.utcnow()
        
        query = select(Publication).where(
            Publication.status == DBPublicationStatus.PUBLISHED,
            Publication.auto_delete_hours.isnot(None),
            Publication.published_time.isnot(None)
        )
        result = await db.execute(query)
        publications = result.scalars().all()
        
        for publication in publications:
            if publication.published_time and publication.auto_delete_hours:
                delete_time = publication.published_time + timedelta(hours=publication.auto_delete_hours)
                
                if now >= delete_time:
                    service = PublicationService(db=db, bot=bot, openai_api_key=OPENAI_API_KEY)
                    try:
                        await service.delete_telegram_messages(publication.id)
                    except Exception as e:
                        await service.create_notification(
                            publication.id,
                            "error",
                            f"Failed to auto-delete publication: {str(e)}",
                            {"error": str(e)}
                        )


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
    
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()


