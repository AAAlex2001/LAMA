"""
Сервис для работы с публикациями.
Бизнес-логика CRUD операций, планирования, мультипостинга.
"""

from typing import List, Optional, Dict
from datetime import datetime, timezone
from uuid import uuid4
import html
import os
from openai import OpenAI

from backend.models.publication import (
    PublicationCreate,
    PublicationUpdate,
    PublicationResponse,
    PublicationStatus,
    PublicationPreview,
    CalendarEvent,
    PublicationNotification,
    AITextRequest,
    AITextResponse,
    SeriesCreate,
    SeriesResponse,
)


class PublicationService:
    """Сервис управления публикациями."""
    
    def __init__(self):
        self.publications: Dict[str, dict] = {}
        self.series: Dict[str, dict] = {}
        
        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_api_key:
            self.ai_client = OpenAI(
                api_key=deepseek_api_key,
                base_url="https://api.deepseek.com"
            )
        else:
            self.ai_client = None

    def create(self, data: PublicationCreate) -> PublicationResponse:
        """Создание новой публикации."""
        pub_id = str(uuid4())
        now = datetime.now(timezone.utc)

        status = PublicationStatus.DRAFT if data.is_draft else (
            PublicationStatus.SCHEDULED if data.scheduled_at else PublicationStatus.PUBLISHED
        )

        # TODO: Конвертация scheduled_at из локального времени в UTC с учетом timezone
        scheduled_at_utc = data.scheduled_at
        if scheduled_at_utc and scheduled_at_utc.tzinfo is None:
            scheduled_at_utc = scheduled_at_utc.replace(tzinfo=timezone.utc)

        publication = {
            "id": pub_id,
            "content_type": data.content_type,
            "text": data.text,
            "media": data.media,
            "poll": data.poll,
            "inline_buttons": data.inline_buttons,
            "link": data.link,
            "channel_ids": data.channel_ids,
            "tags": data.tags or [],
            "status": status,
            "scheduled_at": scheduled_at_utc,
            "published_at": now if status == PublicationStatus.PUBLISHED else None,
            "timezone": data.timezone,
            "auto_pin": data.auto_pin,
            "auto_delete": data.auto_delete,
            "series_id": data.series_id,
            "created_at": now,
            "updated_at": now,
        }

        self.publications[pub_id] = publication
        # TODO: Реализовать планировщик для auto_pin и auto_delete (celery/APScheduler)
        return PublicationResponse(**publication)

    def get(self, publication_id: str) -> Optional[PublicationResponse]:
        """Получение публикации по ID."""
        pub = self.publications.get(publication_id)
        return PublicationResponse(**pub) if pub else None

    def list(
            self,
            status: Optional[PublicationStatus] = None,
            tags: Optional[List[str]] = None,
            channel_id: Optional[str] = None,
            series_id: Optional[str] = None,
    ) -> List[PublicationResponse]:
        """Список публикаций с фильтрацией."""
        results = []

        for pub in self.publications.values():
            if status and pub["status"] != status:
                continue
            if tags and len(tags) > 0 and not any(tag in pub["tags"] for tag in tags):
                continue
            if channel_id and channel_id not in pub["channel_ids"]:
                continue
            if series_id and pub["series_id"] != series_id:
                continue

            results.append(PublicationResponse(**pub))

        return sorted(results, key=lambda x: x.created_at, reverse=True)

    def update(self, publication_id: str, data: PublicationUpdate) -> Optional[PublicationResponse]:
        """Обновление публикации."""
        pub = self.publications.get(publication_id)
        if not pub:
            return None

        update_fields = data.model_dump(exclude_unset=True)
        pub.update(update_fields)
        pub["updated_at"] = datetime.now(timezone.utc)

        if data.scheduled_at:
            pub["status"] = PublicationStatus.SCHEDULED

        return PublicationResponse(**pub)

    def delete(self, publication_id: str) -> bool:
        """Удаление публикации."""
        if publication_id in self.publications:
            self.publications[publication_id]["status"] = PublicationStatus.DELETED
            self.publications[publication_id]["updated_at"] = datetime.now(timezone.utc)
            return True
        return False

    def preview(self, data: PublicationCreate) -> PublicationPreview:
        """Предпросмотр публикации."""
        formatted_html = self.format_to_html(data)

        return PublicationPreview(
            text=data.text,
            media=data.media,
            poll=data.poll,
            inline_buttons=data.inline_buttons,
            formatted_html=formatted_html,
        )

    def get_calendar(self, year: int, month: int) -> List[CalendarEvent]:
        """Получение календаря публикаций за месяц."""
        events: Dict[str, List[PublicationResponse]] = {}

        for pub in self.publications.values():
            if pub["scheduled_at"]:
                pub_date = pub["scheduled_at"]
                if pub_date.year == year and pub_date.month == month:
                    date_key = pub_date.strftime("%Y-%m-%d")
                    if date_key not in events:
                        events[date_key] = []
                    events[date_key].append(PublicationResponse(**pub))

        return [
            CalendarEvent(date=date, publications=pubs)
            for date, pubs in sorted(events.items())
        ]

    def reschedule(self, publication_id: str, new_datetime: datetime, tz: str = "UTC") -> Optional[PublicationResponse]:
        """Перенос публикации на другое время."""
        pub = self.publications.get(publication_id)
        if not pub:
            return None

        # Конвертация в UTC aware datetime
        if new_datetime.tzinfo is None:
            new_datetime = new_datetime.replace(tzinfo=timezone.utc)

        pub["scheduled_at"] = new_datetime
        pub["timezone"] = tz
        pub["status"] = PublicationStatus.SCHEDULED
        pub["updated_at"] = datetime.now(timezone.utc)

        return PublicationResponse(**pub)

    def create_series(self, data: SeriesCreate) -> SeriesResponse:
        """Создание сериала публикаций."""
        series_id = str(uuid4())
        publications = []

        for pub_data in data.publications:
            # Безопасное копирование вместо мутации
            pub_data_copy = pub_data.model_copy(update={"series_id": series_id})
            pub = self.create(pub_data_copy)
            publications.append(pub)

        series = {
            "id": series_id,
            "name": data.name,
            "publications": publications,
            "created_at": datetime.now(timezone.utc),
        }

        self.series[series_id] = series
        return SeriesResponse(**series)

    def get_series(self, series_id: str) -> Optional[SeriesResponse]:
        """Получение сериала по ID."""
        series = self.series.get(series_id)
        return SeriesResponse(**series) if series else None

    def notify(self, publication_id: str, status: str, message: str, **kwargs) -> PublicationNotification:
        """Создание уведомления о публикации."""
        return PublicationNotification(
            publication_id=publication_id,
            status=status,
            message=message,
            **kwargs,
        )

    def ai_generate_text(self, request: AITextRequest) -> AITextResponse:
        """AI генерация/редактирование текста через DeepSeek."""
        if not self.ai_client:
            return AITextResponse(text="AI сервис недоступен. Проверьте DEEPSEEK_API_KEY.")
        
        try:
            if request.action == "generate":
                prompt = f"Напиши пост для Telegram канала. Задача: {request.prompt}\n\nТребования:\n- Краткий и емкий текст\n- Используй эмодзи для оформления\n- Структурированный и читаемый формат"
            elif request.action == "edit":
                prompt = f"Отредактируй следующий текст для Telegram канала.\n\nИсходный текст:\n{request.text}\n\nИнструкция по редактированию: {request.instruction}\n\nВерни только отредактированный текст."
            else:
                return AITextResponse(text="Неизвестное действие. Используй 'generate' или 'edit'.")
            
            response = self.ai_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system",
                        "content": "Ты профессиональный контент-менеджер для Telegram каналов. Создаешь качественный контент: краткий, структурированный, с эмодзи."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            generated_text = response.choices[0].message.content.strip()
            return AITextResponse(text=generated_text)
            
        except Exception as e:
            return AITextResponse(text=f"Ошибка AI: {str(e)}")

    def format_to_html(self, data: PublicationCreate) -> str:
        """Форматирование контента в HTML для предпросмотра."""
        html_parts = []

        if data.text:
            escaped_text = html.escape(data.text)
            html_parts.append(f"<p>{escaped_text}</p>")

        if data.media:
            for media in data.media:
                escaped_url = html.escape(media.url)
                escaped_caption = html.escape(media.caption) if media.caption else ""
                blur_class = 'blur' if media.blur else ''
                html_parts.append(
                    f'<div class="{blur_class}">'
                    f'<img src="{escaped_url}" alt="{escaped_caption}"/>'
                    f'</div>'
                )

        if data.poll:
            escaped_question = html.escape(data.poll.question)
            html_parts.append(f"<div><strong>{escaped_question}</strong></div>")
            for opt in data.poll.options:
                escaped_opt = html.escape(opt.text)
                html_parts.append(f"<div>- {escaped_opt}</div>")

        if data.inline_buttons:
            for row in data.inline_buttons:
                for btn in row:
                    escaped_btn_text = html.escape(btn.text)
                    html_parts.append(f'<button>{escaped_btn_text}</button>')

        return "".join(html_parts)


__all__ = ["PublicationService"]