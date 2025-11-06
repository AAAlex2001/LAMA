from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import (
    EVENT_JOB_EXECUTED,
    EVENT_JOB_ERROR,
    EVENT_JOB_MISSED,
    EVENT_JOB_REMOVED,
)

from backend.services.telegram_service import TelegramService
from backend.services.publication_service import PublicationService
from backend.services.bot_service import BotService
from backend.services.channel_service import ChannelService


UTC_TZ = "UTC"


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class SchedulerService:
    def __init__(
        self,
        bot_service: BotService,
        telegram_service: TelegramService,
        publication_service: PublicationService,
        channel_service: Optional[ChannelService] = None,
    ):
        self.scheduler = AsyncIOScheduler(
            timezone=UTC_TZ,
            job_defaults={"coalesce": True, "misfire_grace_time": 60, "max_instances": 1},
        )
        self.bot_service = bot_service
        self.telegram_service = telegram_service
        self.publication_service = publication_service
        self.channel_service = channel_service

        self.scheduled_jobs: Dict[str, str] = {}
        self.sem_publish = asyncio.Semaphore(5)

        self.scheduler.add_listener(self.on_job_event)

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()

    def stop(self):
        if self.scheduler.running:
            self.scheduler.shutdown()

    def schedule_publication(self, publication_id: str, scheduled_at: datetime, channel_ids: List[str], publication_data: dict):
        run_date = ensure_utc(scheduled_at)
        job = self.scheduler.add_job(
            self.execute_publication,
            trigger=DateTrigger(run_date=run_date, timezone=UTC_TZ),
            args=[publication_id, channel_ids, publication_data],
            id=f"pub_{publication_id}",
            replace_existing=True,
        )
        self.scheduled_jobs[publication_id] = job.id

    async def execute_publication(self, publication_id: str, channel_ids: List[str], publication_data: dict):
        async def publish_one(cid: str):
            async with self.sem_publish:
                res = await self.telegram_service.publish_to_channel(cid, publication_data, publication_id)
                if not res or not res.get("success"):
                    return res
                hours = self.get_auto_delete_hours(publication_data.get("auto_delete"))
                if isinstance(hours, int) and hours > 0:
                    delete_at = ensure_utc(datetime.now(timezone.utc) + timedelta(hours=hours))
                    self.schedule_auto_delete(channel_id=cid, message_id=res["message_id"], delete_at=delete_at)
                return res

        tasks = [asyncio.create_task(publish_one(cid)) for cid in channel_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

    def schedule_auto_delete(self, channel_id: str, message_id: int, delete_at: datetime):
        run_date = ensure_utc(delete_at)
        self.scheduler.add_job(
            self.telegram_service.delete_message,
            trigger=DateTrigger(run_date=run_date, timezone=UTC_TZ),
            args=[channel_id, message_id],
            id=f"delete_{channel_id}_{message_id}",
            replace_existing=True,
        )

    def schedule_bot_message_once(self, job_id: str, run_at: datetime, bot_id: str, target_type: str, target_id: str | int, message: dict) -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=DateTrigger(run_date=ensure_utc(run_at), timezone=UTC_TZ),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    async def execute_bot_message(self, bot_id: str, target_type: str, target_id: str | int, message: dict) -> None:
        from backend.models.bot import SendMessageRequest, MessageTargetType, DMTemplate
        req = SendMessageRequest(
            bot_id=bot_id,
            target_type=MessageTargetType(target_type),
            target_id=target_id,
            message=DMTemplate(**message),
        )
        await self.bot_service.send_message(req)

    def schedule_description_suffix_enforcement(self, bot_id: str) -> None:
        self.scheduler.add_job(
            self.bot_service.enforce_description_suffix,
            trigger=CronTrigger(hour="0,12", timezone=UTC_TZ),
            args=[bot_id],
            id=f"bot_suffix_{bot_id}",
            replace_existing=True,
        )

    def unschedule_description_suffix_enforcement(self, bot_id: str) -> None:
        try:
            self.scheduler.remove_job(f"bot_suffix_{bot_id}")
        except Exception:
            pass

    def schedule_delayed_trigger(self, job_id: str, run_at: datetime, bot_id: str, target_type: str, target_id: str | int, message: dict) -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=DateTrigger(run_date=ensure_utc(run_at), timezone=UTC_TZ),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_daily(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, hour: int, minute: int, timezone_str: str = UTC_TZ) -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(hour=hour, minute=minute, timezone=timezone_str),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_weekly(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, days: list[int], hour: int, minute: int, timezone_str: str = UTC_TZ) -> None:
        dow = ",".join(str(d) for d in days)
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(day_of_week=dow, hour=hour, minute=minute, timezone=timezone_str),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_weekdays(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, hour: int, minute: int, timezone_str: str = UTC_TZ) -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(day_of_week="0-4", hour=hour, minute=minute, timezone=timezone_str),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_monthly(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, month_days: list[int], hour: int, minute: int, timezone_str: str = UTC_TZ) -> None:
        dom = ",".join(str(d) for d in month_days)
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(day=dom, hour=hour, minute=minute, timezone=timezone_str),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_series(self, base_id: str, bot_id: str, target_type: str, target_id: str | int, steps: list[dict], start_at: datetime) -> None:
        start = ensure_utc(start_at)
        for idx, step in enumerate(steps):
            run_at = start + step["offset"]
            self.schedule_bot_message_once(
                job_id=f"series_{base_id}_{idx}",
                run_at=run_at,
                bot_id=bot_id,
                target_type=target_type,
                target_id=target_id,
                message=step["message"],
            )

    def get_auto_delete_hours(self, auto_delete) -> Optional[int]:
        if hasattr(auto_delete, "hours"):
            return auto_delete.hours
        if isinstance(auto_delete, dict):
            return auto_delete.get("hours")
        return None

    def cancel_scheduled_publication(self, publication_id: str) -> bool:
        job_id = self.scheduled_jobs.pop(publication_id, None)
        if not job_id:
            return False
        try:
            self.scheduler.remove_job(job_id)
            return True
        except Exception:
            return False

    def reschedule_publication(self, publication_id: str, new_datetime: datetime, channel_ids: list[str], publication_data: dict):
        self.cancel_scheduled_publication(publication_id)
        self.schedule_publication(publication_id, new_datetime, channel_ids, publication_data)

    def schedule_channels_auto_sync(self, interval_minutes: int = 10) -> None:
        self.scheduler.add_job(
            self.execute_channels_auto_sync,
            trigger=IntervalTrigger(minutes=interval_minutes, timezone=UTC_TZ),
            id="channels_auto_sync",
            replace_existing=True,
        )

    async def execute_channels_auto_sync(self) -> None:
        if not self.channel_service:
            return
        try:
            channels = await self.channel_service.list()
            sem = asyncio.Semaphore(4)

            async def sync(ch):
                if not ch.auto_sync:
                    return
                async with sem:
                    try:
                        await self.channel_service.sync_channel(ch.id)
                    except Exception:
                        pass

            await asyncio.gather(*(asyncio.create_task(sync(ch)) for ch in channels))
        except Exception:
            pass

    def on_job_event(self, event) -> None:
        if not getattr(event, "job_id", None):
            return
        if event.code in (EVENT_JOB_EXECUTED, EVENT_JOB_REMOVED, EVENT_JOB_ERROR, EVENT_JOB_MISSED):
            for pub_id, jid in list(self.scheduled_jobs.items()):
                if jid == event.job_id:
                    self.scheduled_jobs.pop(pub_id, None)
