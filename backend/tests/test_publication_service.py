"""
Тесты для PublicationService.
Бизнес-логика публикаций без HTTP запросов.
"""

import pytest
from datetime import datetime, timezone, timedelta

from backend.services.publication_service import PublicationService
from backend.models.publication import (
    PublicationCreate,
    PublicationUpdate,
    PublicationStatus,
    ContentType,
    SeriesCreate,
)


class TestPublicationService:
    """Тесты для PublicationService."""

    @pytest.fixture
    def service(self):
        """Фикстура сервиса."""
        return PublicationService()

    def test_create_publication(self, service):
        """Создание публикации."""
        data = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Тест",
            channel_ids=["@test"]
        )

        result = service.create(data)

        assert result.text == "Тест"
        assert result.status == PublicationStatus.PUBLISHED
        assert result.id in service.publications

    def test_create_draft(self, service):
        """Создание черновика."""
        data = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Черновик",
            channel_ids=["@test"],
            is_draft=True
        )

        result = service.create(data)

        assert result.status == PublicationStatus.DRAFT

    def test_create_scheduled(self, service):
        """Создание отложенной публикации."""
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        data = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Отложено",
            channel_ids=["@test"],
            scheduled_at=future
        )

        result = service.create(data)

        assert result.status == PublicationStatus.SCHEDULED
        assert result.scheduled_at is not None

    def test_get_publication(self, service):
        """Получение публикации."""
        data = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Тест",
            channel_ids=["@test"]
        )
        created = service.create(data)

        result = service.get(created.id)

        assert result is not None
        assert result.id == created.id

    def test_get_nonexistent(self, service):
        """Получение несуществующей публикации."""
        result = service.get("nonexistent-id")
        assert result is None

    def test_list_publications(self, service):
        """Список публикаций."""
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="1",
            channel_ids=["@test"]
        ))
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="2",
            channel_ids=["@test"]
        ))

        result = service.list()

        assert len(result) >= 2

    def test_list_with_status_filter(self, service):
        """Фильтр по статусу."""
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Черновик",
            channel_ids=["@test"],
            is_draft=True
        ))
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Опубликовано",
            channel_ids=["@test"]
        ))

        drafts = service.list(status=PublicationStatus.DRAFT)
        published = service.list(status=PublicationStatus.PUBLISHED)

        assert any(p.text == "Черновик" for p in drafts)
        assert any(p.text == "Опубликовано" for p in published)

    def test_list_with_tags_filter(self, service):
        """Фильтр по тегам."""
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="С тегом",
            channel_ids=["@test"],
            tags=["important"]
        ))
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Без тега",
            channel_ids=["@test"]
        ))

        result = service.list(tags=["important"])

        assert len(result) > 0
        assert all("important" in p.tags for p in result)

    def test_list_with_empty_tags(self, service):
        """Пустой список тегов не должен фильтровать."""
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Тест",
            channel_ids=["@test"]
        ))

        result = service.list(tags=[])

        assert len(result) > 0

    def test_update_publication(self, service):
        """Обновление публикации."""
        created = service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Старый",
            channel_ids=["@test"]
        ))

        update = PublicationUpdate(text="Новый")
        result = service.update(created.id, update)

        assert result is not None
        assert result.text == "Новый"

    def test_update_nonexistent(self, service):
        """Обновление несуществующей публикации."""
        update = PublicationUpdate(text="Новый")
        result = service.update("nonexistent-id", update)

        assert result is None

    def test_delete_publication(self, service):
        """Удаление публикации."""
        created = service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Удалить",
            channel_ids=["@test"]
        ))

        result = service.delete(created.id)

        assert result is True
        deleted = service.get(created.id)
        assert deleted.status == PublicationStatus.DELETED

    def test_preview(self, service):
        """Предпросмотр публикации."""
        data = PublicationCreate(
            content_type=ContentType.TEXT,
            text="Предпросмотр <script>alert()</script>",
            channel_ids=["@test"]
        )

        result = service.preview(data)

        assert "Предпросмотр" in result.formatted_html
        assert "<script>" not in result.formatted_html
        assert "&lt;script&gt;" in result.formatted_html

    def test_get_calendar(self, service):
        """Календарь публикаций."""
        future = datetime(2025, 12, 15, 12, 0, 0, tzinfo=timezone.utc)
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="В декабре",
            channel_ids=["@test"],
            scheduled_at=future
        ))

        result = service.get_calendar(2025, 12)

        assert len(result) > 0
        assert any(e.date == "2025-12-15" for e in result)

    def test_calendar_filters_by_month(self, service):
        """Календарь фильтрует по году и месяцу."""
        service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="В январе",
            channel_ids=["@test"],
            scheduled_at=datetime(2025, 1, 15, tzinfo=timezone.utc)
        ))

        result = service.get_calendar(2025, 12)

        assert not any(e.date.startswith("2025-01") for e in result)

    def test_reschedule(self, service):
        """Перенос публикации."""
        created = service.create(PublicationCreate(
            content_type=ContentType.TEXT,
            text="Перенести",
            channel_ids=["@test"],
            is_draft=True
        ))

        new_time = datetime.now(timezone.utc) + timedelta(days=1)
        result = service.reschedule(created.id, new_time, "Europe/Moscow")

        assert result is not None
        assert result.status == PublicationStatus.SCHEDULED
        assert result.timezone == "Europe/Moscow"

    def test_create_series(self, service):
        """Создание сериала."""
        series_data = SeriesCreate(
            name="Тестовый сериал",
            publications=[
                PublicationCreate(
                    content_type=ContentType.TEXT,
                    text="Пост 1",
                    channel_ids=["@test"]
                ),
                PublicationCreate(
                    content_type=ContentType.TEXT,
                    text="Пост 2",
                    channel_ids=["@test"]
                )
            ]
        )

        result = service.create_series(series_data)

        assert result.name == "Тестовый сериал"
        assert len(result.publications) == 2
        assert all(p.series_id == result.id for p in result.publications)

    def test_get_series(self, service):
        """Получение сериала."""
        series_data = SeriesCreate(
            name="Сериал",
            publications=[
                PublicationCreate(
                    content_type=ContentType.TEXT,
                    text="Пост",
                    channel_ids=["@test"]
                )
            ]
        )
        created = service.create_series(series_data)

        result = service.get_series(created.id)

        assert result is not None
        assert result.id == created.id

    def test_format_to_html(self, service):
        """Форматирование в HTML."""
        data = PublicationCreate(
            content_type=ContentType.TEXT,
            text="<b>Жирный</b> текст",
            channel_ids=["@test"]
        )

        html = service.format_to_html(data)

        assert "&lt;b&gt;" in html
        assert "<b>" not in html


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


