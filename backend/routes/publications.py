from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.publications import get_session, Publication, Channel
from app.schemas.publications import (
    PublicationCreate, PublicationRead, PublicationUpdate, ChannelCreate, ChannelRead,
    EditRequest, CalendarEvent
)
from app.services.publications import PublicationService, TelegramClient

import os

router = APIRouter(prefix="/api", tags=["publications"])

def get_service(session: AsyncSession = Depends(get_session)) -> PublicationService:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise HTTPException(500, "TELEGRAM_BOT_TOKEN is not configured")
    tg = TelegramClient(token)
    return PublicationService(session, tg)


# --- Health ---

@router.get("/health")
async def health():
    return {"status": "ok"}


# --- Channels ---

@router.post("/channels", response_model=ChannelRead)
async def create_channel(body: ChannelCreate, service: PublicationService = Depends(get_service)):
    ch = await service.create_channel(body.tg_chat_id, body.title, body.timezone, body.is_active)
    await service.session.commit()
    return ChannelRead(id=ch.id, tg_chat_id=ch.tg_chat_id, title=ch.title, timezone=ch.timezone, is_active=ch.is_active)

@router.get("/channels", response_model=List[ChannelRead])
async def list_channels(service: PublicationService = Depends(get_service)):
    items = await service.list_channels()
    return [ChannelRead(id=i.id, tg_chat_id=i.tg_chat_id, title=i.title, timezone=i.timezone, is_active=i.is_active) for i in items]


# --- Publications CRUD ---

@router.post("/publications", response_model=PublicationRead)
async def create_publication(body: PublicationCreate, service: PublicationService = Depends(get_service)):
    pub = await service.create_publication(body.model_dump())
    await service.session.commit()
    return PublicationRead(
        id=pub.id, title=pub.title, content=pub.content, parse_mode=pub.parse_mode,
        auto_pin=pub.auto_pin, auto_delete_hours=pub.auto_delete_hours, preview_only=pub.preview_only,
        tz=pub.tz, tags=[t.name for t in pub.tags], status=pub.status.value,
        scheduled_at=pub.scheduled_at, created_at=pub.created_at, updated_at=pub.updated_at, series_id=pub.series_id
    )

@router.get("/publications", response_model=List[PublicationRead])
async def list_publications(q: Optional[str] = None, tag: Optional[str] = None, service: PublicationService = Depends(get_service)):
    items = await service.list_publications(q, tag)
    return [PublicationRead(
        id=i.id, title=i.title, content=i.content, parse_mode=i.parse_mode,
        auto_pin=i.auto_pin, auto_delete_hours=i.auto_delete_hours, preview_only=i.preview_only,
        tz=i.tz, tags=[t.name for t in i.tags], status=i.status.value,
        scheduled_at=i.scheduled_at, created_at=i.created_at, updated_at=i.updated_at, series_id=i.series_id
    ) for i in items]

@router.get("/publications/{pid}", response_model=PublicationRead)
async def get_publication(pid: UUID, service: PublicationService = Depends(get_service)):
    pub = await service.get_publication(pid)
    return PublicationRead(
        id=pub.id, title=pub.title, content=pub.content, parse_mode=pub.parse_mode,
        auto_pin=pub.auto_pin, auto_delete_hours=pub.auto_delete_hours, preview_only=pub.preview_only,
        tz=pub.tz, tags=[t.name for t in pub.tags], status=pub.status.value,
        scheduled_at=pub.scheduled_at, created_at=pub.created_at, updated_at=pub.updated_at, series_id=pub.series_id
    )

@router.patch("/publications/{pid}", response_model=PublicationRead)
async def update_publication(pid: UUID, body: PublicationUpdate, service: PublicationService = Depends(get_service)):
    pub = await service.update_publication(pid, body.model_dump(exclude_unset=True))
    await service.session.commit()
    return PublicationRead(
        id=pub.id, title=pub.title, content=pub.content, parse_mode=pub.parse_mode,
        auto_pin=pub.auto_pin, auto_delete_hours=pub.auto_delete_hours, preview_only=pub.preview_only,
        tz=pub.tz, tags=[t.name for t in pub.tags], status=pub.status.value,
        scheduled_at=pub.scheduled_at, created_at=pub.created_at, updated_at=pub.updated_at, series_id=pub.series_id
    )

@router.delete("/publications/{pid}")
async def delete_publication(pid: UUID, service: PublicationService = Depends(get_service)):
    await service.delete_publication(pid)
    await service.session.commit()
    return {"ok": True}


# --- Preview, Publish now, Edit, Calendar, TZ, AI ---

@router.post("/publications/{pid}/preview")
async def preview_publication(pid: UUID, service: PublicationService = Depends(get_service)):
    ids = await service.preview_publication(pid)
    await service.session.commit()
    return {"message_ids": ids}

@router.post("/publications/{pid}/publish-now")
async def publish_now(pid: UUID, service: PublicationService = Depends(get_service)):
    pub = await service.get_publication(pid)
    targets = pub.targets
    sent = []
    for t in targets:
        ch = (await service.session.execute(select(Channel).where(Channel.id == t.channel_id))).scalar_one()
        ids = await service.publish_target(t, ch, pub)
        sent.append({"channel_id": str(ch.id), "message_ids": ids})
    pub.status = "published"
    await service.session.commit()
    return {"results": sent}

@router.post("/publications/{pid}/schedule-delete")
async def schedule_delete(pid: UUID, hours: int = Query(24, ge=1), service: PublicationService = Depends(get_service)):
    pub = await service.get_publication(pid)
    for t in pub.targets:
        if t.message_ids:
            when = datetime.now(tz=timezone.utc) + timedelta(hours=hours)
            for _ in t.message_ids:
                service.session.add(
                    ScheduledTask(action=TaskAction.delete, publication_id=pub.id, target_id=t.id, channel_id=t.channel_id, run_at=when)
                )
    await service.session.commit()
    return {"ok": True}

@router.post("/publications/{pid}/edit")
async def edit_publication(pid: UUID, body: EditRequest, service: PublicationService = Depends(get_service)):
    await service.edit_published(pid, body.channel_id, body.message_index, body.new_text, body.new_caption, body.parse_mode)
    await service.session.commit()
    return {"ok": True}

@router.get("/calendar", response_model=List[CalendarEvent])
async def get_calendar(service: PublicationService = Depends(get_service)):
    events = await service.calendar_events()
    return events

@router.patch("/calendar/{pid}/reschedule")
async def reschedule(pid: UUID, new_dt: datetime, service: PublicationService = Depends(get_service)):
    pub = await service.get_publication(pid)
    pub.scheduled_at = new_dt
    await service.session.execute(
        update(Publication).where(Publication.id == pid).values(scheduled_at=new_dt)
    )
    # refresh publish tasks
    await service.session.execute(
        delete(ScheduledTask).where(ScheduledTask.publication_id == pid, ScheduledTask.action == TaskAction.publish, ScheduledTask.status == TaskStatus.pending)
    )
    await service.schedule_publish_tasks(pub)
    await service.session.commit()
    return {"ok": True}

@router.get("/tz/resolve")
async def tz_resolve(lat: float, lon: float, service: PublicationService = Depends(get_service)):
    tz_name = service.resolve_timezone_by_geo(lat, lon)
    return {"timezone": tz_name}

@router.post("/ai/suggest")
async def ai_suggest(text: str, instruction: Optional[str] = None, service: PublicationService = Depends(get_service)):
    improved = await service.ai_suggest(text, instruction)
    return {"text": improved}
