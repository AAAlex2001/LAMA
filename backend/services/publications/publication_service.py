from datetime import datetime
from typing import Optional, List

import pytz
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import PublicationNotification
from backend.models.channels import ChannelGroup as Channel
from backend.schemas.publications.ai import AIEditRequest
from backend.schemas.publications.publication_response import CalendarEntry, DayCount, PublicationResponse
from backend.schemas.publications.publishing import (
    EditPublishedRequest,
    PublishResult,
    EditMessageResult,
    DeleteMessageResult,
)
from backend.services.channel import ChannelService
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.services.publications.publication_update_service import PublicationUpdateService
from backend.services.publications.calendar_service import CalendarService
from backend.services.publications.ai_service import AIService
from backend.services.publications.series_service import SeriesService
from backend.services.publications.repeat_calculator import calculate_next_repeat_time
from backend.services.publications import publisher, message_editor
from backend.services.telegram_client import RateLimitedBot
from backend.config import get_bot


class PublicationService:
    """Orchestrator for publication operations that require cross-service logic."""

    def __init__(self, db: AsyncSession, openai_api_key: Optional[str] = None):
        self.db = db
        self.query = PublicationQueryService(db)
        self.updater = PublicationUpdateService(db)
        self.calendar = CalendarService(db)
        self.ai = AIService(api_key=openai_api_key)
        self.channel_service = ChannelService(db=db)

    def get_bot(self) -> RateLimitedBot:
        return get_bot()

    async def bot_for_channel(self, channel: Channel) -> RateLimitedBot:
        return get_bot()

    # ── Publication CRUD (with logic) ──

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None):
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        return publication

    async def update_publication(self, publication_id: int, data, owner_id: Optional[int] = None):
        publication = await self.get_publication(publication_id, owner_id)
        return await self.updater.update_publication(publication, data, owner_id)

    async def delete_publication(self, publication_id: int, owner_id: Optional[int] = None):
        publication = await self.get_publication(publication_id, owner_id)
        await self.updater.delete_publication(publication)

    async def reschedule_publication(self, publication_id: int, new_time: datetime, owner_id: Optional[int] = None):
        publication = await self.get_publication(publication_id, owner_id)
        return await self.updater.reschedule_publication(publication, new_time)

    # ── Calendar ──

    async def get_calendar(
        self,
        year: int,
        month: int,
        tz_str: str = "UTC",
        owner_id: Optional[int] = None,
    ) -> List[CalendarEntry]:
        publications = await self.calendar.get_calendar(year, month, owner_id)
        tz = pytz.timezone(tz_str)
        grouped: dict[str, List[PublicationResponse]] = {}
        for pub in publications:
            key = pub.scheduled_time.astimezone(tz).strftime("%Y-%m-%d")
            grouped.setdefault(key, []).append(pub)
        return [
            CalendarEntry(date=date_str, publications=pubs)
            for date_str, pubs in grouped.items()
        ]

    async def get_day_counts(self, start: datetime, end: datetime, owner_id: Optional[int] = None) -> List[DayCount]:
        return await self.calendar.get_day_counts(start, end, owner_id)

    # ── AI (with logic) ──

    async def edit_with_ai(self, request: AIEditRequest, owner_id: Optional[int] = None):
        publication = await self.get_publication(request.publication_id, owner_id=owner_id)
        if not publication.text_content:
            return None
        edited = await self.ai.edit_content(publication.text_content, request.instruction)
        publication.text_content = edited
        publication.ai_generated = True
        await self.db.commit()
        return publication

    # ── Notification helper ──

    async def create_notification(self, publication_id: int, status: str, message: str, error_details=None):
        notification = PublicationNotification(
            publication_id=publication_id, status=status, message=message, error_details=error_details,
        )
        self.db.add(notification)
        await self.db.flush()

    # ── Publishing ──

    async def publish_now(self, publication_id: int, owner_id: Optional[int] = None) -> PublishResult:
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            return PublishResult(success=False, error="Publication not found", results=[], success_count=0, total_count=0)
        if not publication.channels:
            return PublishResult(success=False, error="No channels selected", results=[], success_count=0, total_count=0)

        if publication.series_id and publication.series and publication.series.reply_to_previous:
            series_service = SeriesService(self.db)
            return await series_service.publish_series_post(publication, self.get_bot())

        return await publisher.publish_to_channels(
            publication, self.db, self.channel_service,
            self.bot_for_channel, self.create_notification, calculate_next_repeat_time,
        )

    async def republish(self, publication_id: int) -> PublishResult:
        publication = await self.query.get_publication(publication_id)
        if not publication:
            return PublishResult(success=False, error="Publication not found", results=[], success_count=0, total_count=0)
        if not publication.channels:
            return PublishResult(success=False, error="No channels selected", results=[], success_count=0, total_count=0)

        return await publisher.republish(
            publication, self.db, self.bot_for_channel, calculate_next_repeat_time,
        )

    async def edit_published_message(self, publication_id: int, request: EditPublishedRequest, owner_id: Optional[int] = None):
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            return EditMessageResult(success=False, error="Publication not found", results=[], success_count=0, total_count=0)
        return await message_editor.edit_published_message(publication, request, self.db, self.bot_for_channel)

    async def delete_telegram_messages(self, publication_id: int, owner_id: Optional[int] = None):
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            return DeleteMessageResult(success=False, error="Publication not found", results=[], success_count=0, total_count=0)
        return await message_editor.delete_telegram_messages(publication, self.db, self.bot_for_channel)
