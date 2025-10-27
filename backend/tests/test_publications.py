"""
Тесты для модуля публикаций.
CRUD операции, календарь, предпросмотр, AI редактор.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta

from backend.main import app

client = TestClient(app)


class TestPublicationCRUD:
    """Тесты для CRUD операций с публикациями."""

    def test_create_text_publication(self):
        """Создание текстовой публикации."""
        response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Тестовый пост",
                "channel_ids": ["@test_channel"],
                "tags": ["test", "demo"],
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content_type"] == "text"
        assert data["text"] == "Тестовый пост"
        assert data["status"] == "published"
        assert "id" in data

    def test_create_draft_publication(self):
        """Создание черновика."""
        response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Черновик",
                "channel_ids": ["@test_channel"],
                "is_draft": True,
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "draft"

    def test_create_scheduled_publication(self):
        """Создание отложенной публикации."""
        future_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Отложенный пост",
                "channel_ids": ["@test_channel"],
                "scheduled_at": future_time,
                "timezone": "Europe/Moscow",
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "scheduled"
        assert data["scheduled_at"] is not None

    def test_create_publication_with_media(self):
        """Создание публикации с медиа."""
        response = client.post(
            "/publications",
            json={
                "content_type": "image",
                "text": "Фото",
                "media": [
                    {
                        "url": "https://example.com/image.jpg",
                        "blur": True,
                        "caption": "Описание"
                    }
                ],
                "channel_ids": ["@test_channel"],
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content_type"] == "image"
        assert len(data["media"]) == 1
        assert data["media"][0]["blur"] is True

    def test_create_publication_with_poll(self):
        """Создание публикации с опросом."""
        response = client.post(
            "/publications",
            json={
                "content_type": "poll",
                "poll": {
                    "question": "Как дела?",
                    "options": [
                        {"text": "Отлично"},
                        {"text": "Нормально"}
                    ],
                    "is_anonymous": True,
                    "allows_multiple_answers": False
                },
                "channel_ids": ["@test_channel"],
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content_type"] == "poll"
        assert data["poll"]["question"] == "Как дела?"

    def test_create_publication_with_inline_buttons(self):
        """Создание публикации с кнопками."""
        response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Нажми кнопку",
                "inline_buttons": [
                    [
                        {
                            "text": "Открыть сайт",
                            "url": "https://example.com"
                        }
                    ]
                ],
                "channel_ids": ["@test_channel"],
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data["inline_buttons"]) == 1
        assert data["inline_buttons"][0][0]["text"] == "Открыть сайт"

    def test_create_publication_with_auto_delete(self):
        """Создание публикации с автоудалением."""
        response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Удалится через 24 часа",
                "channel_ids": ["@test_channel"],
                "auto_delete": {
                    "enabled": True,
                    "hours": 24
                }
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["auto_delete"]["hours"] == 24

    def test_get_publication(self):
        """Получение публикации по ID."""
        create_response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Тест",
                "channel_ids": ["@test_channel"],
            }
        )
        pub_id = create_response.json()["id"]

        response = client.get(f"/publications/{pub_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == pub_id

    def test_get_nonexistent_publication(self):
        """Получение несуществующей публикации."""
        response = client.get("/publications/nonexistent-id")
        assert response.status_code == 404

    def test_list_publications(self):
        """Получение списка публикаций."""
        response = client.get("/publications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_publications_with_filters(self):
        """Фильтрация публикаций."""
        client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Тег тест",
                "channel_ids": ["@test_channel"],
                "tags": ["important"],
            }
        )

        response = client.get("/publications?tags=important")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0

    def test_update_publication(self):
        """Обновление публикации."""
        create_response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Старый текст",
                "channel_ids": ["@test_channel"],
            }
        )
        pub_id = create_response.json()["id"]

        response = client.put(
            f"/publications/{pub_id}",
            json={
                "text": "Новый текст"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Новый текст"

    def test_delete_publication(self):
        """Удаление публикации."""
        create_response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Удалить",
                "channel_ids": ["@test_channel"],
            }
        )
        pub_id = create_response.json()["id"]

        response = client.delete(f"/publications/{pub_id}")
        assert response.status_code == 204


class TestPublicationPreview:
    """Тесты для предпросмотра публикаций."""

    def test_preview_text(self):
        """Предпросмотр текста."""
        response = client.post(
            "/publications/preview",
            json={
                "content_type": "text",
                "text": "Предпросмотр текста",
                "channel_ids": ["@test_channel"],
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "formatted_html" in data
        assert "Предпросмотр текста" in data["formatted_html"]

    def test_preview_with_media(self):
        """Предпросмотр с медиа."""
        response = client.post(
            "/publications/preview",
            json={
                "content_type": "image",
                "text": "Фото",
                "media": [
                    {
                        "url": "https://example.com/image.jpg",
                        "blur": False
                    }
                ],
                "channel_ids": ["@test_channel"],
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "<img" in data["formatted_html"]

    def test_preview_html_escaping(self):
        """Проверка экранирования HTML."""
        response = client.post(
            "/publications/preview",
            json={
                "content_type": "text",
                "text": "<script>alert('xss')</script>",
                "channel_ids": ["@test_channel"],
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "&lt;script&gt;" in data["formatted_html"]
        assert "<script>" not in data["formatted_html"]


class TestCalendar:
    """Тесты для календаря публикаций."""

    def test_get_calendar(self):
        """Получение календаря."""
        future_time = datetime(2025, 11, 15, 12, 0, 0, tzinfo=timezone.utc)
        client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "В календаре",
                "channel_ids": ["@test_channel"],
                "scheduled_at": future_time.isoformat(),
            }
        )

        response = client.get("/publications/calendar/2025/11")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_calendar_filters_by_month(self):
        """Календарь фильтрует по месяцу."""
        response = client.get("/publications/calendar/2099/12")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestReschedule:
    """Тесты для переноса публикаций."""

    def test_reschedule_publication(self):
        """Перенос публикации на другое время."""
        create_response = client.post(
            "/publications",
            json={
                "content_type": "text",
                "text": "Перенести",
                "channel_ids": ["@test_channel"],
                "is_draft": True,
            }
        )
        pub_id = create_response.json()["id"]

        new_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        response = client.patch(
            f"/publications/{pub_id}/reschedule",
            json={
                "scheduled_at": new_time,
                "timezone": "UTC"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "scheduled"


class TestSeries:
    """Тесты для сериалов публикаций."""

    def test_create_series(self):
        """Создание сериала публикаций."""
        time1 = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        time2 = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

        response = client.post(
            "/publications/series",
            json={
                "name": "Тестовый сериал",
                "publications": [
                    {
                        "content_type": "text",
                        "text": "Пост 1",
                        "channel_ids": ["@test_channel"],
                        "scheduled_at": time1,
                    },
                    {
                        "content_type": "text",
                        "text": "Пост 2",
                        "channel_ids": ["@test_channel"],
                        "scheduled_at": time2,
                    }
                ]
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Тестовый сериал"
        assert len(data["publications"]) == 2
        assert "id" in data

    def test_get_series(self):
        """Получение сериала по ID."""
        time1 = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        create_response = client.post(
            "/publications/series",
            json={
                "name": "Сериал",
                "publications": [
                    {
                        "content_type": "text",
                        "text": "Пост",
                        "channel_ids": ["@test_channel"],
                        "scheduled_at": time1,
                    }
                ]
            }
        )
        series_id = create_response.json()["id"]

        response = client.get(f"/publications/series/{series_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == series_id


class TestAIEditor:
    """Тесты для AI текстового редактора."""

    def test_ai_generate_text(self):
        """Генерация текста через AI."""
        response = client.post(
            "/publications/ai/text",
            json={
                "action": "generate",
                "prompt": "Напиши пост о программировании"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert len(data["text"]) > 10  # AI сгенерировал текст

    def test_ai_edit_text(self):
        """Редактирование текста через AI."""
        response = client.post(
            "/publications/ai/text",
            json={
                "action": "edit",
                "text": "Исходный текст",
                "instruction": "Сделай более креативным"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert len(data["text"]) > 10  # AI отредактировал текст

    def test_ai_unknown_action(self):
        """Неизвестное действие."""
        response = client.post(
            "/publications/ai/text",
            json={
                "action": "unknown"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "Неизвестное действие" in data["text"]


class TestNotifications:
    """Тесты для уведомлений."""

    def test_send_notification(self):
        """Отправка уведомления."""
        response = client.post(
            "/publications/notify",
            json={
                "publication_id": "test-123",
                "status": "success",
                "message": "Публикация успешна",
                "channel_id": "@test_channel"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["message"] == "Публикация успешна"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

