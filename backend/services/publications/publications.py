from datetime import datetime, timedelta
from typing import Optional, List, Dict
import pytz

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, RepeatInterval as DBRepeatInterval
from backend.models.channels import ChannelGroup as Channel
from backend.schemas.publications import (
    AIGenerateRequest, AIEditRequest, EditPublishedRequest,
    PublishResult, EditMessageResult, DeleteMessageResult
)
from backend.services.channel import ChannelService
from backend.services.publications.CRUD_publications import CRUDPublicationService
from backend.services.publications.ai_service import AIService
from backend.services.publications import publisher, message_editor
from backend.services.telegram_client import RateLimitedBot
from backend.config import get_bot


class PublicationService:
    """Сервис публикаций - главный оркестратор"""

    def __init__(self, db: AsyncSession, openai_api_key: Optional[str] = None):
        self.db = db
        self.crud = CRUDPublicationService(db)
        self.ai_service = AIService(api_key=openai_api_key)
        self.channel_service = ChannelService(db=db)

    def get_master_bot(self) -> RateLimitedBot:
        """Получить мастер-бота для публикаций"""
        return get_bot()

    async def get_bot_for_channel(self, channel: Channel) -> RateLimitedBot:
        """Получить бота для публикаций в канал"""
        return get_bot()

    async def create_publication(self, data, owner_id: int):
        return await self.crud.create_publication(data, owner_id)

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None):
        return await self.crud.get_publication(publication_id, owner_id)

    async def get_publications(self, **kwargs):
        return await self.crud.get_publications(**kwargs)

    async def update_publication(self, publication_id: int, data, owner_id: Optional[int] = None):
        return await self.crud.update_publication(publication_id, data, owner_id)

    async def delete_publication(self, publication_id: int, owner_id: Optional[int] = None):
        return await self.crud.delete_publication(publication_id, owner_id)

    async def create_series(self, name: str, description: Optional[str] = None, reply_to_previous: bool = True):
        return await self.crud.create_series(name, description, reply_to_previous)

    async def reschedule_publication(self, publication_id: int, new_time: datetime, owner_id: Optional[int] = None):
        return await self.crud.reschedule_publication(publication_id, new_time, owner_id)

    async def create_notification(self, publication_id: int, status: str, message: str, error_details: Optional[Dict] = None):
        return await self.crud.create_notification(publication_id, status, message, error_details)

    async def get_calendar(self, year: int, month: int, timezone_str: str = "UTC", owner_id: Optional[int] = None) -> Dict[str, List[Publication]]:
        """Получить календарь публикаций за месяц"""
        publications = await self.crud.get_calendar(year, month, owner_id)
        tz = pytz.timezone(timezone_str)
        calendar_dict = {}
        for pub in publications:
            pub_time = pub.scheduled_time.astimezone(tz)
            date_key = pub_time.strftime('%Y-%m-%d')
            if date_key not in calendar_dict:
                calendar_dict[date_key] = []
            calendar_dict[date_key].append(pub)
        return calendar_dict

    async def generate_with_ai(self, request: AIGenerateRequest) -> str:
        """Сгенерировать контент с помощью AI"""
        return await self.ai_service.generate_content(request)

    async def edit_with_ai(self, request: AIEditRequest, owner_id: Optional[int] = None) -> Optional[Publication]:
        """Редактировать контент публикации с помощью AI"""
        publication = await self.get_publication(request.publication_id, owner_id=owner_id)
        if not publication or not publication.text_content:
            return None

        edited_content = await self.ai_service.edit_content(
            original_text=publication.text_content,
            instruction=request.instruction
        )

        publication.text_content = edited_content
        publication.ai_generated = True
        await self.db.commit()

        return publication

    async def edit_text_with_ai(self, text: str, instruction: str) -> str:
        """Редактировать текст с помощью AI без привязки к публикации"""
        return await self.ai_service.edit_content(
            original_text=text,
            instruction=instruction
        )

    async def edit_text_with_ai_stream(self, text: str, instruction: str):
        """Редактировать текст с помощью AI со streaming"""
        async for chunk in self.ai_service.edit_content_stream(
            original_text=text,
            instruction=instruction
        ):
            yield chunk

    async def publish_now(self, publication_id: int, owner_id: Optional[int] = None) -> PublishResult:
        """Опубликовать сейчас"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return PublishResult(
                success=False,
                error="Publication not found",
                results=[],
                success_count=0,
                total_count=0
            )

        if not publication.channels:
            return PublishResult(
                success=False,
                error="No channels selected",
                results=[],
                success_count=0,
                total_count=0
            )

        if publication.series_id and publication.series:
            if publication.series.reply_to_previous:
                from backend.services.publications.series_service import SeriesService
                series_service = SeriesService(self.db)
                bot = self.get_master_bot()
                series_result = await series_service.publish_series_post(publication, bot)
                
                if isinstance(series_result, dict):
                    return PublishResult(
                        success=series_result.get("success", False),
                        results=series_result.get("results", []),
                        success_count=series_result.get("success_count", 0),
                        total_count=series_result.get("total_count", 0),
                        publication_id=publication.id,
                        error=series_result.get("error")
                    )
                return series_result

        return await publisher.publish_to_channels(
            publication,
            self.db,
            self.channel_service,
            self.get_bot_for_channel,
            self.create_notification,
            calculate_next_repeat_time
        )

    async def republish(self, publication_id: int) -> PublishResult:
        """Повторно опубликовать пост"""
        publication = await self.get_publication(publication_id)
        if not publication:
            return PublishResult(
                success=False,
                error="Publication not found",
                results=[],
                success_count=0,
                total_count=0
            )

        if not publication.channels:
            return PublishResult(
                success=False,
                error="No channels selected",
                results=[],
                success_count=0,
                total_count=0
            )

        return await publisher.republish(
            publication,
            self.db,
            self.get_bot_for_channel,
            calculate_next_repeat_time
        )

    async def edit_published_message(
        self,
        publication_id: int,
        request: EditPublishedRequest,
        owner_id: Optional[int] = None
    ) -> EditMessageResult:
        """Редактировать уже опубликованное сообщение"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return EditMessageResult(
                success=False,
                error="Publication not found",
                results=[],
                success_count=0,
                total_count=0
            )

        return await message_editor.edit_published_message(
            publication,
            request,
            self.db,
            self.get_bot_for_channel
        )

    async def delete_telegram_messages(self, publication_id: int, owner_id: Optional[int] = None) -> DeleteMessageResult:
        """Удалить опубликованные сообщения из Telegram"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return DeleteMessageResult(
                success=False,
                error="Publication not found",
                results=[],
                success_count=0,
                total_count=0
            )

        return await message_editor.delete_telegram_messages(
            publication,
            self.db,
            self.get_bot_for_channel
        )

    async def retransmit_post(self, original_post, target_channel_id: int):
        """Ретранслировать пост"""
        return await self.channel_service.retransmit_post(
            original_post=original_post,
            target_channel_id=target_channel_id
        )


def calculate_next_repeat_time(
    base_time: datetime,
    repeat_interval: DBRepeatInterval,
    custom_days: Optional[int] = None,
    custom_hours: Optional[int] = None
) -> Optional[datetime]:
    """Вычислить следующее время повтора"""
    if repeat_interval == DBRepeatInterval.NEVER:
        return None

    if repeat_interval == DBRepeatInterval.DAILY:
        return base_time + timedelta(days=1)
    elif repeat_interval == DBRepeatInterval.WEEKLY:
        return base_time + timedelta(weeks=1)
    elif repeat_interval == DBRepeatInterval.BIWEEKLY:
        return base_time + timedelta(weeks=2)
    elif repeat_interval == DBRepeatInterval.MONTHLY:
        return base_time + timedelta(days=30)
    elif repeat_interval == DBRepeatInterval.YEARLY:
        return base_time + timedelta(days=365)
    elif repeat_interval == DBRepeatInterval.CUSTOM:
        total_days = custom_days or 0
        total_hours = custom_hours or 0
        if total_days > 0 or total_hours > 0:
            return base_time + timedelta(days=total_days, hours=total_hours)

    return None
