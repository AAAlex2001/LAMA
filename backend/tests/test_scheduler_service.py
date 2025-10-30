"""
Тесты для SchedulerService.
Планировщик отложенных публикаций и автоудаления.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from backend.services.scheduler_service import SchedulerService


class TestSchedulerService:
    """Тесты для SchedulerService."""

    @pytest.fixture
    def service(self):
        """Фикстура планировщика."""
        with patch("backend.services.scheduler_service.TelegramService"):
            service = SchedulerService()
            service.scheduler = MagicMock()
            return service

    def test_start_scheduler(self, service):
        """Запуск планировщика."""
        service.scheduler.running = False
        service.start()
        service.scheduler.start.assert_called_once()

    def test_start_already_running(self, service):
        """Запуск уже работающего планировщика."""
        service.scheduler.running = True
        service.start()
        service.scheduler.start.assert_not_called()

    def test_stop_scheduler(self, service):
        """Остановка планировщика."""
        service.scheduler.running = True
        service.stop()
        service.scheduler.shutdown.assert_called_once()

    def test_stop_not_running(self, service):
        """Остановка неработающего планировщика."""
        service.scheduler.running = False
        service.stop()
        service.scheduler.shutdown.assert_not_called()

    def test_schedule_publication(self, service):
        """Планирование публикации."""
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        mock_job = MagicMock()
        mock_job.id = "job-123"
        service.scheduler.add_job.return_value = mock_job

        service.schedule_publication(
            publication_id="pub-123",
            scheduled_at=future,
            channel_ids=["@test"],
            publication_data={}
        )

        service.scheduler.add_job.assert_called_once()
        assert "pub-123" in service.scheduled_jobs
        assert service.scheduled_jobs["pub-123"] == "job-123"

    def test_schedule_auto_delete(self, service):
        """Планирование автоудаления."""
        delete_time = datetime.now(timezone.utc) + timedelta(hours=24)

        service.schedule_auto_delete(
            channel_id="@test",
            message_id=123,
            delete_at=delete_time
        )

        service.scheduler.add_job.assert_called_once()
        call_args = service.scheduler.add_job.call_args
        assert call_args[1]["id"] == "delete_@test_123"

    def test_cancel_scheduled_publication(self, service):
        """Отмена запланированной публикации."""
        service.scheduled_jobs["pub-123"] = "job-123"

        result = service.cancel_scheduled_publication("pub-123")

        assert result is True
        service.scheduler.remove_job.assert_called_once_with("job-123")
        assert "pub-123" not in service.scheduled_jobs

    def test_cancel_nonexistent_publication(self, service):
        """Отмена несуществующей публикации."""
        result = service.cancel_scheduled_publication("nonexistent")

        assert result is False
        service.scheduler.remove_job.assert_not_called()

    def test_cancel_publication_with_error(self, service):
        """Отмена публикации с ошибкой."""
        service.scheduled_jobs["pub-123"] = "job-123"
        service.scheduler.remove_job.side_effect = Exception("Error")

        result = service.cancel_scheduled_publication("pub-123")

        assert result is False

    def test_reschedule_publication(self, service):
        """Перенос публикации."""
        service.scheduled_jobs["pub-123"] = "job-123"
        new_time = datetime.now(timezone.utc) + timedelta(hours=2)
        mock_job = MagicMock()
        mock_job.id = "job-456"
        service.scheduler.add_job.return_value = mock_job

        service.reschedule_publication(
            publication_id="pub-123",
            new_datetime=new_time,
            channel_ids=["@test"],
            publication_data={}
        )

        service.scheduler.remove_job.assert_called_once()
        assert service.scheduler.add_job.called
        assert service.scheduled_jobs["pub-123"] == "job-456"

    def test_get_auto_delete_hours_from_object(self, service):
        """Получение hours из объекта."""
        auto_delete = MagicMock()
        auto_delete.hours = 24

        result = service.get_auto_delete_hours(auto_delete)

        assert result == 24

    def test_get_auto_delete_hours_from_dict(self, service):
        """Получение hours из dict."""
        auto_delete = {"hours": 48}

        result = service.get_auto_delete_hours(auto_delete)

        assert result == 48

    def test_get_auto_delete_hours_from_dict_no_hours(self, service):
        """Получение hours из dict без поля hours."""
        auto_delete = {"enabled": True}

        result = service.get_auto_delete_hours(auto_delete)

        assert result is None

    def test_get_auto_delete_hours_none(self, service):
        """Получение hours из None."""
        result = service.get_auto_delete_hours(None)

        assert result is None

    def test_get_auto_delete_hours_invalid_type(self, service):
        """Получение hours из невалидного типа."""
        result = service.get_auto_delete_hours("invalid")

        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


