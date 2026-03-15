from datetime import datetime, timezone
from typing import Optional, List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, PublicationNotification, PublicationStatus as DBPublicationStatus
from backend.models.channels import ChannelGroup as Channel
from backend.schemas.publications.ai import AIGenerateRequest, AIEditRequest
from backend.schemas.publications.enums import PublicationStatus, ContentType
from backend.schemas.publications.publication_response import DayCount
from backend.schemas.publications.publishing import (
    EditPublishedRequest,
    PublishResult,
    EditMessageResult,
    DeleteMessageResult,
)
from backend.schemas.publications.templates import TextTemplateCreate, TextTemplateUpdate
from backend.services.channel import ChannelService
from backend.services.publications.publication_create_service import PublicationCreateService
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.services.publications.publication_update_service import PublicationUpdateService
from backend.services.publications.calendar_service import CalendarService
from backend.services.publications.sharing_service import SharingService
from backend.services.publications.template_service import TemplateService
from backend.services.publications.ai_service import AIService
from backend.services.publications.series_service import SeriesService
from backend.services.publications.repeat_calculator import calculate_next_repeat_time
from backend.services.publications import publisher, message_editor
from backend.services.telegram_client import RateLimitedBot
from backend.services.bot_provider import resolve_for_channel


class PublicationService:
    """Main orchestrator for all publication operations."""

    def __init__(self, db: AsyncSession, openai_api_key: Optional[str] = None):
        self.db = db
        self.creator = PublicationCreateService(db)
        self.query = PublicationQueryService(db)
        self.updater = PublicationUpdateService(db)
        self.calendar = CalendarService(db)
        self.sharing = SharingService(db)
        self.templates = TemplateService(db)
        self.ai = AIService(api_key=openai_api_key)
        self.channel_service = ChannelService(db=db)

    async def bot_for_channel(self, channel: Channel) -> RateLimitedBot:
        """Бот для канала (user bot или master)."""
        return await resolve_for_channel(self.db, channel)

    # ── Publication CRUD ──

    async def create_publication(self, data, owner_id: int):
        return await self.creator.create_publication(data, owner_id)

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None):
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        return publication

    async def get_publications_compact(
        self,
        owner_id: Optional[int] = None,
        status: Optional[PublicationStatus] = None,
        content_type: Optional[ContentType] = None,
        channel_id: Optional[int] = None,
        tag_names: Optional[List[str]] = None,
        tag_ids: Optional[List[int]] = None,
        series_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        sort_order: Optional[str] = None,
        date_mode: Optional[str] = "scheduled",
        skip: int = 0,
        limit: int = 100,
    ) -> List[Publication]:
        return await self.query.get_publications_compact(
            owner_id=owner_id,
            status=status,
            content_type=content_type,
            channel_id=channel_id,
            tag_names=tag_names,
            tag_ids=tag_ids,
            series_id=series_id,
            start_date=start_date,
            end_date=end_date,
            search=search,
            sort_order=sort_order,
            date_mode=date_mode,
            skip=skip,
            limit=limit,
        )

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

    async def get_day_counts(
        self,
        start: datetime,
        end: datetime,
        owner_id: Optional[int] = None,
        mode: str = "scheduled",
    ) -> List[DayCount]:
        return await self.calendar.get_day_counts(start, end, owner_id, mode)

    # ── Series ──

    async def create_series(self, name: str, description: Optional[str] = None, reply_to_previous: bool = True):
        series_service = SeriesService(self.db)
        return await series_service.create_series(name, description, reply_to_previous)

    # ── Sharing ──

    async def generate_share_token(self, publication_id: int, owner_id: int):
        return await self.sharing.generate_share_token(publication_id, owner_id)

    async def get_publication_by_share_token(self, token: str):
        return await self.sharing.get_publication_by_share_token(token)

    async def consume_share_token(self, token: str):
        return await self.sharing.consume_share_token(token)

    # ── Templates ──

    async def create_text_template(self, user_id: int, data: TextTemplateCreate):
        return await self.templates.create_text_template(user_id, data)

    async def get_text_templates(self, user_id: int, search=None, skip: int = 0, limit: int = 100):
        return await self.templates.get_text_templates(user_id, search, skip, limit)

    async def get_text_template_by_id(self, template_id: int, user_id: int):
        return await self.templates.get_text_template_by_id(template_id, user_id)

    async def update_text_template(self, template_id: int, user_id: int, data: TextTemplateUpdate):
        return await self.templates.update_text_template(template_id, user_id, data)

    async def delete_text_template(self, template_id: int, user_id: int):
        return await self.templates.delete_text_template(template_id, user_id)

    # ── AI ──

    async def generate_with_ai(self, request: AIGenerateRequest) -> str:
        return await self.ai.generate_content(request)

    async def edit_with_ai(self, request: AIEditRequest, owner_id: Optional[int] = None):
        publication = await self.get_publication(request.publication_id, owner_id=owner_id)
        if not publication.text_content:
            raise HTTPException(status_code=400, detail="Publication has no text content to edit")
        edited = await self.ai.edit_content(publication.text_content, request.instruction)
        publication.text_content = edited
        publication.ai_generated = True
        await self.db.flush()
        await self.db.refresh(publication)
        return publication

    async def edit_text_with_ai(self, text: str, instruction: str) -> str:
        return await self.ai.edit_content(text, instruction)

    async def edit_text_with_ai_stream(self, text: str, instruction: str):
        async for chunk in self.ai.edit_content_stream(text, instruction):
            yield chunk

    # ── Notification helper ──

    async def create_notification(self, publication_id: int, status: str, message: str, error_details=None):
        notification = PublicationNotification(
            publication_id=publication_id, status=status, message=message, error_details=error_details,
        )
        self.db.add(notification)
        await self.db.flush()

    # ── Publishing ──

    async def prepare_for_publishing(self, publication_id: int, owner_id: Optional[int] = None) -> Publication:
        """Подготавливает публикацию к отправке, проверяет каналы и меняет статус."""
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        if not publication.channels:
            raise HTTPException(status_code=400, detail="No channels selected")

        publication.status = DBPublicationStatus.SCHEDULED
        publication.published_time = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(publication)
        return publication

    async def publish_now(self, publication_id: int, owner_id: Optional[int] = None) -> PublishResult:
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        if not publication.channels:
            raise HTTPException(status_code=400, detail="No channels selected")

        if publication.status in (DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS):
            return PublishResult(
                success=True, results=[], success_count=0, total_count=0,
                publication_id=publication_id, error="Already published",
            )

        if publication.series_id and publication.series and publication.series.reply_to_previous:
            series_service = SeriesService(self.db)
            return await series_service.publish_series_post(publication, self.bot_for_channel)

        return await publisher.publish_to_channels(
            publication, self.db, self.channel_service,
            self.bot_for_channel, self.create_notification, calculate_next_repeat_time,
        )

    async def republish(self, publication_id: int) -> PublishResult:
        publication = await self.query.get_publication(publication_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        if not publication.channels:
            raise HTTPException(status_code=400, detail="No channels selected")

        return await publisher.republish(
            publication, self.db, self.bot_for_channel, calculate_next_repeat_time,
        )

    async def edit_published_message(self, publication_id: int, request: EditPublishedRequest, owner_id: Optional[int] = None):
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        return await message_editor.edit_published_message(publication, request, self.db, self.bot_for_channel)

    async def delete_telegram_messages(self, publication_id: int, owner_id: Optional[int] = None):
        publication = await self.query.get_publication(publication_id, owner_id)
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        return await message_editor.delete_telegram_messages(publication, self.db, self.bot_for_channel)
