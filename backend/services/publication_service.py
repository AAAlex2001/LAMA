"""
Сервис для работы с публикациями на Postgres (без in-memory).
Бизнес-логика CRUD, фильтры, календарь, серии, AI-помощник.
Оптимизирован под нагрузку: SQL-фильтры/пагинация, .returning(), async AI с лимитером/ретраями.
"""

from typing import List, Optional, Dict
from datetime import datetime, timezone
import html
import os
import asyncio

from openai import AsyncOpenAI

from sqlalchemy import select, update as sa_update, and_
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.dialects.postgresql import array

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
from backend.models.db_models import Publication as PublicationORM, PublicationSeries as PublicationSeriesORM


AI_SEM = asyncio.Semaphore(10)


class PublicationService:
    """Сервис управления публикациями (через БД)."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory
        key = os.getenv("DEEPSEEK_API_KEY")
        self.ai_client = AsyncOpenAI(api_key=key, base_url="https://api.deepseek.com") if key else None

    # ---------- CRUD ----------
    async def create(self, data: PublicationCreate) -> PublicationResponse:
        now = datetime.now(timezone.utc)
        status = PublicationStatus.DRAFT if data.is_draft else (
            PublicationStatus.SCHEDULED if data.scheduled_at else PublicationStatus.PUBLISHED
        )
        scheduled_at = data.scheduled_at
        if scheduled_at and scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

        async with self.session_factory() as session:
            orm = PublicationORM(
                content_type=(data.content_type.value if hasattr(data.content_type, "value") else str(data.content_type)),
                text=data.text,
                media=[m.model_dump() for m in (data.media or [])] if data.media else None,
                poll=data.poll.model_dump() if data.poll else None,
                inline_buttons=[[btn.model_dump() for btn in row] for row in (data.inline_buttons or [])] if data.inline_buttons else None,
                link=data.link,
                channel_ids=list(data.channel_ids) if data.channel_ids else None,
                tags=list(data.tags) if data.tags else None,
                status=(status.value if hasattr(status, "value") else str(status)),
                scheduled_at=scheduled_at,
                published_at=(now if status == PublicationStatus.PUBLISHED else None),
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
        from uuid import UUID
        try:
            pid = UUID(publication_id)
        except Exception:
            return None
        async with self.session_factory() as session:
            orm = await session.get(PublicationORM, pid)
            return self.to_response(orm) if orm else None

    async def list(
        self,
        status: Optional[PublicationStatus] = None,
        tags: Optional[List[str]] = None,
        channel_id: Optional[str] = None,
        series_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[PublicationResponse]:
        async with self.session_factory() as session:
            q = select(PublicationORM)
            if status is not None:
                q = q.where(PublicationORM.status == (status.value if hasattr(status, "value") else str(status)))
            if series_id is not None:
                q = q.where(PublicationORM.series_id == series_id)
            if channel_id is not None:
                q = q.where(PublicationORM.channel_ids.contains([channel_id]))
            if tags:
                q = q.where(PublicationORM.tags.op("&&")(array(tags)))
            q = q.order_by(PublicationORM.created_at.desc()).limit(limit).offset(offset)
            rows = (await session.execute(q)).scalars().all()
            return [self.to_response(r) for r in rows]

    async def update(self, publication_id: str, data: PublicationUpdate) -> Optional[PublicationResponse]:
        from uuid import UUID
        try:
            pid = UUID(publication_id)
        except Exception:
            return None

        async with self.session_factory() as session:
            current = await session.get(PublicationORM, pid)
            if not current:
                return None

            upd = data.model_dump(exclude_unset=True)

            if "content_type" in upd and hasattr(upd["content_type"], "value"):
                upd["content_type"] = upd["content_type"].value
            if "media" in upd:
                upd["media"] = [m.model_dump() for m in upd["media"]] if upd["media"] else None
            if "poll" in upd:
                upd["poll"] = (upd["poll"].model_dump() if upd["poll"] else None)
            if "inline_buttons" in upd:
                upd["inline_buttons"] = ([[btn.model_dump() for btn in row] for row in upd["inline_buttons"]]
                                         if upd["inline_buttons"] else None)
            if "auto_delete" in upd:
                upd["auto_delete"] = (upd["auto_delete"].model_dump() if upd["auto_delete"] else None)
            if "tags" in upd:
                upd["tags"] = list(upd["tags"]) if upd["tags"] else None
            if "channel_ids" in upd:
                upd["channel_ids"] = list(upd["channel_ids"]) if upd["channel_ids"] else None

            if "scheduled_at" in upd and upd["scheduled_at"] and upd["scheduled_at"].tzinfo is None:
                upd["scheduled_at"] = upd["scheduled_at"].replace(tzinfo=timezone.utc)

            if upd.get("scheduled_at"):
                upd["status"] = PublicationStatus.SCHEDULED.value
            if upd.get("status") == PublicationStatus.PUBLISHED.value and not current.published_at:
                upd["published_at"] = datetime.now(timezone.utc)
            if upd.get("scheduled_at") is None and current.status == PublicationStatus.SCHEDULED.value:
                upd.setdefault("status", PublicationStatus.DRAFT.value)

            upd["updated_at"] = datetime.now(timezone.utc)

            stmt = sa_update(PublicationORM).where(PublicationORM.id == pid).values(**upd).returning(PublicationORM)
            row = (await session.execute(stmt)).fetchone()
            await session.commit()
            return self.to_response(row[0]) if row else None

    async def delete(self, publication_id: str) -> bool:
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

    # ---------- Preview / Calendar / Series ----------
    def preview(self, data: PublicationCreate) -> PublicationPreview:
        html_parts = []
        if data.text:
            html_parts.append(f"<p>{html.escape(data.text)}</p>")
        if data.media:
            for m in data.media:
                url = html.escape(m.url)
                cap = html.escape(m.caption) if m.caption else ""
                cls = "blur" if m.blur else ""
                html_parts.append(f'<div class="{cls}"><img src="{url}" alt="{cap}"/></div>')
        if data.poll:
            html_parts.append(f"<div><strong>{html.escape(data.poll.question)}</strong></div>")
            for opt in data.poll.options:
                html_parts.append(f"<div>- {html.escape(opt.text)}</div>")
        if data.inline_buttons:
            for row in data.inline_buttons:
                for btn in row:
                    html_parts.append(f"<button>{html.escape(btn.text)}</button>")
        return PublicationPreview(
            text=data.text,
            media=data.media,
            poll=data.poll,
            inline_buttons=data.inline_buttons,
            formatted_html="".join(html_parts),
        )

    async def get_calendar(self, year: int, month: int) -> List[CalendarEvent]:
        from dateutil.relativedelta import relativedelta
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        end = start + relativedelta(months=1)
        async with self.session_factory() as session:
            q = (select(PublicationORM)
                 .where(and_(PublicationORM.scheduled_at >= start, PublicationORM.scheduled_at < end))
                 .order_by(PublicationORM.scheduled_at.asc()))
            rows = (await session.execute(q)).scalars().all()
            bucket: Dict[str, List[PublicationResponse]] = {}
            for r in rows:
                key = r.scheduled_at.strftime("%Y-%m-%d") if r.scheduled_at else None
                if key:
                    bucket.setdefault(key, []).append(self.to_response(r))
            return [CalendarEvent(date=day, publications=pubs) for day, pubs in sorted(bucket.items())]

    async def reschedule(self, publication_id: str, new_datetime: datetime, tz: str = "UTC") -> Optional[PublicationResponse]:
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
        async with self.session_factory() as session:
            sorm = PublicationSeriesORM(name=data.name)
            session.add(sorm)
            await session.flush()
            now = datetime.now(timezone.utc)
            pub_orms: List[PublicationORM] = []
            for p in data.publications:
                scheduled_at = p.scheduled_at
                if scheduled_at and scheduled_at.tzinfo is None:
                    scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
                status = PublicationStatus.DRAFT if p.is_draft else (
                    PublicationStatus.SCHEDULED if p.scheduled_at else PublicationStatus.PUBLISHED
                )
                pub = PublicationORM(
                    content_type=(p.content_type.value if hasattr(p.content_type, "value") else str(p.content_type)),
                    text=p.text,
                    media=[m.model_dump() for m in (p.media or [])] if p.media else None,
                    poll=p.poll.model_dump() if p.poll else None,
                    inline_buttons=[[btn.model_dump() for btn in row] for row in (p.inline_buttons or [])] if p.inline_buttons else None,
                    link=p.link,
                    channel_ids=list(p.channel_ids) if p.channel_ids else None,
                    tags=list(p.tags) if p.tags else None,
                    status=(status.value if hasattr(status, "value") else str(status)),
                    scheduled_at=scheduled_at,
                    published_at=(now if status == PublicationStatus.PUBLISHED else None),
                    timezone=p.timezone,
                    auto_pin=bool(p.auto_pin),
                    auto_delete=(p.auto_delete.model_dump() if p.auto_delete else None),
                    series_id=str(sorm.id),
                )
                session.add(pub)
                pub_orms.append(pub)
            await session.commit()
            for po in pub_orms:
                await session.refresh(po)
            pubs = [self.to_response(po) for po in pub_orms]
            return SeriesResponse(id=str(sorm.id), name=data.name, publications=pubs, created_at=sorm.created_at)

    async def get_series(self, series_id: str, limit: int = 200, offset: int = 0) -> Optional[SeriesResponse]:
        from uuid import UUID
        try:
            sid = UUID(series_id)
        except Exception:
            return None
        async with self.session_factory() as session:
            s = await session.get(PublicationSeriesORM, sid)
            if not s:
                return None
            q = (select(PublicationORM)
                 .where(PublicationORM.series_id == series_id)
                 .order_by(PublicationORM.created_at.desc())
                 .limit(limit).offset(offset))
            pubs = [self.to_response(r) for r in (await session.execute(q)).scalars().all()]
            return SeriesResponse(id=str(s.id), name=s.name, publications=pubs, created_at=s.created_at)

    # ---------- Notifications / AI ----------
    def notify(self, publication_id: str, status: str, message: str, **kwargs) -> PublicationNotification:
        return PublicationNotification(publication_id=publication_id, status=status, message=message, **kwargs)

    async def ai_generate_text(self, request: AITextRequest) -> AITextResponse:
        if not self.ai_client:
            return AITextResponse(text="AI сервис недоступен. Проверьте DEEPSEEK_API_KEY.")

        if request.action == "generate":
            prompt = (
                f"Напиши пост для Telegram канала. Задача: {request.prompt}\n\n"
                f"Требования:\n- Краткий и ёмкий текст\n- Эмодзи\n- Структурированный формат"
            )
        elif request.action == "edit":
            prompt = (
                f"Отредактируй текст для Telegram канала.\n\nИсходный текст:\n{request.text}\n\n"
                f"Инструкция: {request.instruction}\nВерни только отредактированный текст."
            )
        else:
            return AITextResponse(text="Неизвестное действие. Используй 'generate' или 'edit'.")

        backoff = 0.5
        for attempt in range(3):
            try:
                async with AI_SEM:
                    resp = await asyncio.wait_for(
                        self.ai_client.chat.completions.create(
                            model="deepseek-chat",
                            messages=[
                                {"role": "system", "content": "Ты контент-менеджер для Telegram: кратко, структурно, с эмодзи."},
                                {"role": "user", "content": prompt},
                            ],
                            temperature=0.7,
                            max_tokens=800,
                        ),
                        timeout=20,
                    )
                text = (resp.choices[0].message.content or "").strip()
                return AITextResponse(text=text or "Пустой ответ AI")
            except Exception:
                if attempt == 2:
                    return AITextResponse(text="Ошибка AI: не удалось получить ответ")
                await asyncio.sleep(backoff)
                backoff *= 2

    # ---------- Utils ----------
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
