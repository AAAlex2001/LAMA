"""
Сервис планировщика для отложенных публикаций и автоудаления.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from typing import Dict, Optional

from backend.services.telegram_service import TelegramService
from backend.services.publication_service import PublicationService
from backend.services.bot_service import BotService
from backend.services.channel_service import ChannelService


class SchedulerService:
    """Планировщик задач для публикаций."""

    def __init__(self, bot_service: BotService):
        self.scheduler = AsyncIOScheduler()
        self.telegram_service = TelegramService()
        self.publication_service = PublicationService()
        self.bot_service = bot_service
        self.scheduled_jobs: Dict[str, str] = {}
        self.channel_service: ChannelService | None = None

    def start(self):
        """Запуск планировщика."""
        if not self.scheduler.running:
            self.scheduler.start()

    def stop(self):
        """Остановка планировщика."""
        if self.scheduler.running:
            self.scheduler.shutdown()

    def schedule_publication(
        self,
        publication_id: str,
        scheduled_at: datetime,
        channel_ids: list,
        publication_data: dict,
    ):
        """Планирование отложенной публикации."""
        job = self.scheduler.add_job(
            self.execute_publication,
            trigger=DateTrigger(run_date=scheduled_at),
            args=[publication_id, channel_ids, publication_data],
            id=f"pub_{publication_id}",
        )
        self.scheduled_jobs[publication_id] = job.id

    async def execute_publication(
        self,
        publication_id: str,
        channel_ids: list,
        publication_data: dict,
    ):
        """Выполнение отложенной публикации."""
        for channel_id in channel_ids:
            result = await self.telegram_service.publish_to_channel(
                channel_id=channel_id,
                publication=publication_data,
                publication_id=publication_id,
            )

            if result["success"]:
                auto_delete = publication_data.get("auto_delete")
                if auto_delete:
                    hours = self.get_auto_delete_hours(auto_delete)
                    if isinstance(hours, int) and hours > 0:
                        delete_at = datetime.now() + timedelta(hours=hours)
                        if delete_at <= datetime.now():
                            continue
                        self.schedule_auto_delete(
                            channel_id=channel_id,
                            message_id=result["message_id"],
                            delete_at=delete_at,
                        )

    def schedule_auto_delete(
        self,
        channel_id: str,
        message_id: int,
        delete_at: datetime,
    ):
        """Планирование автоудаления сообщения."""
        self.scheduler.add_job(
            self.telegram_service.delete_message,
            trigger=DateTrigger(run_date=delete_at),
            args=[channel_id, message_id],
            id=f"delete_{channel_id}_{message_id}",
        )

    # ==== Бот-сообщения и серии ====

    def schedule_bot_message_once(
        self,
        job_id: str,
        run_at: datetime,
        bot_id: str,
        target_type: str,
        target_id: str | int,
        message: dict,
    ) -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=DateTrigger(run_date=run_at),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
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
        """Проверка/добавление суффикса описания бота дважды в сутки."""
        self.scheduler.add_job(
            self.bot_service.enforce_description_suffix,
            trigger=CronTrigger(hour="0,12"),
            args=[bot_id],
            id=f"bot_suffix_{bot_id}",
            replace_existing=True,
        )

    def unschedule_description_suffix_enforcement(self, bot_id: str) -> None:
        job_id = f"bot_suffix_{bot_id}"
        try:
            self.scheduler.remove_job(job_id)
        except Exception:
            pass

    # ==== Отложенные триггеры ====
    def schedule_delayed_trigger(self, job_id: str, run_at: datetime, bot_id: str, target_type: str, target_id: str | int, message: dict) -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=DateTrigger(run_date=run_at),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
        )

    # ==== Расширенные расписания ====

    def schedule_bot_daily(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, hour: int, minute: int, timezone: str = "UTC") -> None:
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(hour=hour, minute=minute, timezone=timezone),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_weekly(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, days: list[int], hour: int, minute: int, timezone: str = "UTC") -> None:
        dow = ",".join(str((d + 1) % 7) for d in days)  # CronTrigger: 0=Mon -> translate to 0..6
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(day_of_week=dow, hour=hour, minute=minute, timezone=timezone),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_weekdays(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, hour: int, minute: int, timezone: str = "UTC") -> None:
        """Расписание для будних дней (пн-пт)."""
        # CronTrigger: 0=Mon, 1=Tue, ..., 4=Fri
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(day_of_week="0-4", hour=hour, minute=minute, timezone=timezone),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_bot_monthly(self, job_id: str, bot_id: str, target_type: str, target_id: str | int, message: dict, month_days: list[int], hour: int, minute: int, timezone: str = "UTC") -> None:
        dom = ",".join(str(d) for d in month_days)
        self.scheduler.add_job(
            self.execute_bot_message,
            trigger=CronTrigger(day=dom, hour=hour, minute=minute, timezone=timezone),
            args=[bot_id, target_type, target_id, message],
            id=job_id,
            replace_existing=True,
        )

    def schedule_series(self, base_id: str, bot_id: str, target_type: str, target_id: str | int, steps: list[dict], start_at: datetime) -> None:
        for idx, step in enumerate(steps):
            run_at = start_at + step["offset"]
            job_id = f"series_{base_id}_{idx}"
            self.schedule_bot_message_once(
                job_id=job_id,
                run_at=run_at,
                bot_id=bot_id,
                target_type=target_type,
                target_id=target_id,
                message=step["message"],
            )

    def get_auto_delete_hours(self, auto_delete) -> Optional[int]:
        """Безопасное получение hours из auto_delete (dict или объект)."""
        if hasattr(auto_delete, "hours"):
            return auto_delete.hours
        elif isinstance(auto_delete, dict):
            return auto_delete.get("hours")
        return None

    def cancel_scheduled_publication(self, publication_id: str) -> bool:
        """Отмена запланированной публикации."""
        job_id = self.scheduled_jobs.get(publication_id)
        if job_id:
            try:
                self.scheduler.remove_job(job_id)
                del self.scheduled_jobs[publication_id]
                return True
            except Exception:
                return False
        return False

    def reschedule_publication(
        self,
        publication_id: str,
        new_datetime: datetime,
        channel_ids: list,
        publication_data: dict,
    ):
        """Перенос публикации на другое время."""
        self.cancel_scheduled_publication(publication_id)
        self.schedule_publication(
            publication_id=publication_id,
            scheduled_at=new_datetime,
            channel_ids=channel_ids,
            publication_data=publication_data,
        )

    # ==== Автосинхронизация каналов ====
    def schedule_channels_auto_sync(self, interval_minutes: int = 10) -> None:
        """Периодическая автосинхронизация каналов с auto_sync=True."""
        self.scheduler.add_job(
            self.execute_channels_auto_sync,
            trigger=CronTrigger(minute=f"*/{interval_minutes}"),
            id="channels_auto_sync",
            replace_existing=True,
        )

    async def execute_channels_auto_sync(self) -> None:
        if not self.channel_service:
            return
        try:
            channels = await self.channel_service.list()
            for ch in channels:
                if ch.auto_sync:
                    try:
                        await self.channel_service.sync_channel(ch.id)
                    except Exception:
                        pass
        except Exception:
            pass


__all__ = ["SchedulerService"]

