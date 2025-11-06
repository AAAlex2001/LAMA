"""
Сервис для работы с публикациями на Postgres (без in-memory).
Бизнес-логика CRUD, фильтры, календарь, серии, AI-помощник.
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
from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from backend.models.db_models import Publication as PublicationORM, PublicationSeries as PublicationSeriesORM


class PublicationService:
    """Сервис управления публикациями (через БД)."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory
        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_api_key:
            self.ai_client = OpenAI(
                api_key=deepseek_api_key,
                base_url="https://api.deepseek.com"
            )
        else:
            self.ai_client = None

    async def create(self, data: PublicationCreate) -> PublicationResponse:
        """Создание новой публикации."""
        now = datetime.now(timezone.utc)
        status = (
            PublicationStatus.DRAFT
            if data.is_draft
            else (PublicationStatus.SCHEDULED if data.scheduled_at else PublicationStatus.PUBLISHED)
        )
        scheduled_at_utc = data.scheduled_at
        if scheduled_at_utc and scheduled_at_utc.tzinfo is None:
            scheduled_at_utc = scheduled_at_utc.replace(tzinfo=timezone.utc)
        async with self.session_factory() as session:
            orm = PublicationORM(
                content_type=data.content_type.value if hasattr(data.content_type, "value") else str(data.content_type),
                text=data.text,
                media=[m.model_dump() for m in (data.media or [])] if data.media else None,
                poll=data.poll.model_dump() if data.poll else None,
                inline_buttons=[[btn.model_dump() for btn in row] for row in (data.inline_buttons or [])] if data.inline_buttons else None,
                link=data.link,
                channel_ids=list(data.channel_ids) if data.channel_ids else None,
                tags=list(data.tags) if data.tags else None,
                status=status.value if hasattr(status, "value") else str(status),
                scheduled_at=scheduled_at_utc,
                published_at=now if status == PublicationStatus.PUBLISHED else None,
                timezone=data.timezone,
                auto_pin=bool(data.auto_pin),
                auto_delete=(data.auto_delete.model_dump() if data.auto_delete else None),
                series_id=data.series_id,
            )
            session.add(orm)
            await session.commit()
            await session.refresh(orm)
            return self.to_response(orm)

    async def get(self, publication_id: str) -> Optional[PublicationResponse]:
        """Получение публикации по ID."""
        async with self.session_factory() as session:
            from uuid import UUID
            try:
                pid = UUID(publication_id)
            except Exception:
                return None
            orm = await session.get(PublicationORM, pid)
            return self.to_response(orm) if orm else None

    async def list(
            self,
            status: Optional[PublicationStatus] = None,
            tags: Optional[List[str]] = None,
            channel_id: Optional[str] = None,
            series_id: Optional[str] = None,
    ) -> List[PublicationResponse]:
        """Список публикаций с фильтрацией."""
        async with self.session_factory() as session:
            q = select(PublicationORM)
            if status is not None:
                q = q.where(PublicationORM.status == (status.value if hasattr(status, "value") else str(status)))
            if series_id is not None:
                q = q.where(PublicationORM.series_id == series_id)
            if channel_id is not None:
                q = q.where(PublicationORM.channel_ids.contains([channel_id]))
            if tags:
                # "хотя бы один" тег — простая фильтрация в Python после выборки
                pass
            res = await session.execute(q)
            rows = res.scalars().all()
            if tags:
                rows = [r for r in rows if r.tags and any(t in r.tags for t in tags)]
            rows.sort(key=lambda r: r.created_at, reverse=True)
            return [self.to_response(r) for r in rows]

    async def update(self, publication_id: str, data: PublicationUpdate) -> Optional[PublicationResponse]:
        """Обновление публикации."""
        from uuid import UUID
        try:
            pid = UUID(publication_id)
        except Exception:
            return None
        async with self.session_factory() as session:
            orm = await session.get(PublicationORM, pid)
            if not orm:
                return None
            upd = data.model_dump(exclude_unset=True)
            if "content_type" in upd and hasattr(upd["content_type"], "value"):
                upd["content_type"] = upd["content_type"].value
            if "media" in upd:
                upd["media"] = [m.model_dump() for m in upd["media"]] if upd["media"] else None
            if "poll" in upd and upd["poll"] is not None:
                upd["poll"] = upd["poll"].model_dump()
            if "inline_buttons" in upd and upd["inline_buttons"] is not None:
                upd["inline_buttons"] = [[btn.model_dump() for btn in row] for row in upd["inline_buttons"]]
            if "auto_delete" in upd and upd["auto_delete"] is not None:
                upd["auto_delete"] = upd["auto_delete"].model_dump()
            if "tags" in upd and upd["tags"] is not None:
                upd["tags"] = list(upd["tags"]) or None
            if "channel_ids" in upd and upd["channel_ids"] is not None:
                upd["channel_ids"] = list(upd["channel_ids"]) or None
            if upd.get("scheduled_at"):
                upd["status"] = PublicationStatus.SCHEDULED.value
            await session.execute(sa_update(PublicationORM).where(PublicationORM.id == pid).values(**upd))
            await session.commit()
            await session.refresh(orm)
            return self.to_response(orm)

    async def delete(self, publication_id: str) -> bool:
        """Удаление публикации."""
        from uuid import UUID
        try:
            pid = UUID(publication_id)
        except Exception:
            return False
        async with self.session_factory() as session:
            orm = await session.get(PublicationORM, pid)
            if not orm:
                return False
            orm.status = PublicationStatus.DELETED.value
            orm.updated_at = datetime.now(timezone.utc)
            await session.commit()
            return True

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

    async def get_calendar(self, year: int, month: int) -> List[CalendarEvent]:
        """Получение календаря публикаций за месяц."""
        async with self.session_factory() as session:
            from dateutil.relativedelta import relativedelta
            start = datetime(year, month, 1, tzinfo=timezone.utc)
            end = start + relativedelta(months=1)
            res = await session.execute(
                select(PublicationORM).where(
                    PublicationORM.scheduled_at >= start, PublicationORM.scheduled_at < end
                )
            )
            rows = res.scalars().all()
            bucket: Dict[str, List[PublicationResponse]] = {}
            for r in rows:
                key = r.scheduled_at.strftime("%Y-%m-%d") if r.scheduled_at else None
                if not key:
                    continue
                bucket.setdefault(key, []).append(self.to_response(r))
            return [CalendarEvent(date=day, publications=pubs) for day, pubs in sorted(bucket.items())]

    async def reschedule(self, publication_id: str, new_datetime: datetime, tz: str = "UTC") -> Optional[PublicationResponse]:
        """Перенос публикации на другое время."""
        from uuid import UUID
        try:
            pid = UUID(publication_id)
        except Exception:
            return None
        if new_datetime.tzinfo is None:
            new_datetime = new_datetime.replace(tzinfo=timezone.utc)
        async with self.session_factory() as session:
            orm = await session.get(PublicationORM, pid)
            if not orm:
                return None
            orm.scheduled_at = new_datetime
            orm.timezone = tz
            orm.status = PublicationStatus.SCHEDULED.value
            orm.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(orm)
            return self.to_response(orm)

    async def create_series(self, data: SeriesCreate) -> SeriesResponse:
        """Создание сериала публикаций."""
        async with self.session_factory() as session:
            sorm = PublicationSeriesORM(name=data.name)
            session.add(sorm)
            await session.flush()
            pub_orms: List[PublicationORM] = []
            now = datetime.now(timezone.utc)
            for p in data.publications:
                scheduled_at_utc = p.scheduled_at
                if scheduled_at_utc and scheduled_at_utc.tzinfo is None:
                    scheduled_at_utc = scheduled_at_utc.replace(tzinfo=timezone.utc)
                status = (
                    PublicationStatus.DRAFT
                    if p.is_draft
                    else (PublicationStatus.SCHEDULED if p.scheduled_at else PublicationStatus.PUBLISHED)
                )
                pub_orm = PublicationORM(
                    content_type=p.content_type.value if hasattr(p.content_type, "value") else str(p.content_type),
                    text=p.text,
                    media=[m.model_dump() for m in (p.media or [])] if p.media else None,
                    poll=p.poll.model_dump() if p.poll else None,
                    inline_buttons=[[btn.model_dump() for btn in row] for row in (p.inline_buttons or [])] if p.inline_buttons else None,
                    link=p.link,
                    channel_ids=list(p.channel_ids) if p.channel_ids else None,
                    tags=list(p.tags) if p.tags else None,
                    status=status.value if hasattr(status, "value") else str(status),
                    scheduled_at=scheduled_at_utc,
                    published_at=now if status == PublicationStatus.PUBLISHED else None,
                    timezone=p.timezone,
                    auto_pin=bool(p.auto_pin),
                    auto_delete=(p.auto_delete.model_dump() if p.auto_delete else None),
                    series_id=str(sorm.id),
                )
                session.add(pub_orm)
                pub_orms.append(pub_orm)
            await session.commit()
            for po in pub_orms:
                await session.refresh(po)
            pubs = [self.to_response(po) for po in pub_orms]
            return SeriesResponse(id=str(sorm.id), name=data.name, publications=pubs, created_at=sorm.created_at)

    async def get_series(self, series_id: str) -> Optional[SeriesResponse]:
        """Получение сериала по ID."""
        from uuid import UUID
        try:
            sid = UUID(series_id)
        except Exception:
            return None
        async with self.session_factory() as session:
            s = await session.get(PublicationSeriesORM, sid)
            if not s:
                return None
            res = await session.execute(select(PublicationORM).where(PublicationORM.series_id == series_id))
            pubs = [self.to_response(r) for r in res.scalars().all()]
            return SeriesResponse(id=str(s.id), name=s.name, publications=pubs, created_at=s.created_at)

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

    def to_response(self, orm: PublicationORM) -> PublicationResponse:
        return PublicationResponse(
            id=str(orm.id),
            content_type=orm.content_type,
            text=orm.text,
            media=orm.media,
            poll=orm.poll,
            inline_buttons=orm.inline_buttons,
            link=orm.link,
            channel_ids=orm.channel_ids or [],
            tags=orm.tags or [],
            status=PublicationStatus(orm.status),
            scheduled_at=orm.scheduled_at,
            published_at=orm.published_at,
            timezone=orm.timezone,
            auto_pin=orm.auto_pin,
            auto_delete=orm.auto_delete,
            series_id=orm.series_id,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )


__all__ = ["PublicationService"]