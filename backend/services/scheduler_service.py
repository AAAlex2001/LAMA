"""
Сервис планировщика для отложенных публикаций и автоудаления.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from datetime import datetime, timedelta
from typing import Dict, Optional

from backend.services.telegram_service import TelegramService
from backend.services.publication_service import PublicationService


class SchedulerService:
    """Планировщик задач для публикаций."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.telegram_service = TelegramService()
        self.publication_service = PublicationService()
        self.scheduled_jobs: Dict[str, str] = {}

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
                    if hours:
                        delete_at = datetime.now() + timedelta(hours=hours)
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


__all__ = ["SchedulerService"]

