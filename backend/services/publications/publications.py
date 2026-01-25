from datetime import datetime, timedelta
import calendar
from typing import Optional, List, Dict
import pytz
from dateutil.relativedelta import relativedelta

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
from backend.services.publications.series_service import SeriesService
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
                series_service = SeriesService(self.db)
                bot = self.get_master_bot()
                series_result = await series_service.publish_series_post(publication, bot)
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
    custom_hours: Optional[int] = None,
    repeat_end_time: Optional[datetime] = None,
    custom_unit: Optional[str] = None,
    custom_value: Optional[int] = None,
    repeat_weekdays: Optional[List[int]] = None,
    repeat_month_days: Optional[List[int]] = None,
    repeat_year_month: Optional[int] = None,
    repeat_year_days: Optional[List[int]] = None
) -> Optional[datetime]:
    """Вычислить следующее время повтора"""
    if repeat_interval == DBRepeatInterval.NEVER:
        return None

    next_time: Optional[datetime] = None

    if repeat_interval == DBRepeatInterval.DAILY:
        next_time = base_time + relativedelta(days=1)
    elif repeat_interval == DBRepeatInterval.WEEKLY:
        next_time = base_time + relativedelta(weeks=1)
    elif repeat_interval == DBRepeatInterval.BIWEEKLY:
        next_time = base_time + relativedelta(weeks=2)
    elif repeat_interval == DBRepeatInterval.MONTHLY:
        # Календарное прибавление месяца без дрейфа по времени суток
        next_time = base_time + relativedelta(months=1)
    elif repeat_interval == DBRepeatInterval.YEARLY:
        next_time = base_time + relativedelta(years=1)
    elif repeat_interval == DBRepeatInterval.CUSTOM:
        if custom_unit and custom_value and custom_value > 0:
            unit = custom_unit

            if unit == "days":
                next_time = base_time + relativedelta(days=custom_value)

            elif unit == "weeks":
                allowed_weekdays = repeat_weekdays or ([0] if base_time.weekday() == 6 else [base_time.weekday() + 1])
                # UI: Sunday=0, Monday=1... Saturday=6 -> map to Python weekday (Mon=0..Sun=6)
                normalized_weekdays = []
                for day in allowed_weekdays:
                    if day == 0:
                        normalized_weekdays.append(6)
                    else:
                        normalized_weekdays.append(day - 1)
                normalized_weekdays = sorted(set(normalized_weekdays))

                base_date = base_time.date()
                base_week_start = base_date - timedelta(days=base_date.weekday())
                max_days = custom_value * 7 * 2
                for offset in range(1, max_days + 1):
                    candidate_date = base_date + timedelta(days=offset)
                    weeks_since_base = ((candidate_date - base_week_start).days) // 7
                    if weeks_since_base % custom_value != 0:
                        continue
                    if candidate_date.weekday() not in normalized_weekdays:
                        continue
                    next_time = base_time.replace(
                        year=candidate_date.year,
                        month=candidate_date.month,
                        day=candidate_date.day,
                    )
                    break

            elif unit == "months":
                days = sorted(set(repeat_month_days or [base_time.day]))
                candidate = base_time + relativedelta(months=custom_value)
                for _ in range(24):
                    last_day = calendar.monthrange(candidate.year, candidate.month)[1]
                    valid_days = [d for d in days if d <= last_day]
                    if valid_days:
                        day = valid_days[0]
                        next_time = candidate.replace(day=day)
                        break
                    candidate = candidate + relativedelta(months=custom_value)

            elif unit == "years":
                days = sorted(set(repeat_year_days or [base_time.day]))
                month = repeat_year_month or base_time.month
                candidate_year = base_time.year + custom_value
                for _ in range(24):
                    last_day = calendar.monthrange(candidate_year, month)[1]
                    valid_days = [d for d in days if d <= last_day]
                    if valid_days:
                        day = valid_days[0]
                        next_time = base_time.replace(year=candidate_year, month=month, day=day)
                        break
                    candidate_year += custom_value

        else:
            total_days = custom_days or 0
            total_hours = custom_hours or 0
            if total_days == 0 and total_hours == 0:
                return None
            next_time = base_time + relativedelta(days=total_days, hours=total_hours)

    if next_time is None:
        return None

    if repeat_end_time and next_time > repeat_end_time:
        return None

    return next_time
