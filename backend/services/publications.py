from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, or_, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import pytz
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, InputMediaPhoto, InputMediaVideo, InputMediaDocument, InputMediaAudio
from aiogram.enums import ParseMode
import httpx
import json

from backend.models.publications import (
    Publication, Channel, Tag, PublicationSeries,
    TelegramMessage, PublicationNotification,
    PublicationStatus as DBPublicationStatus,
    ContentType as DBContentType
)
from backend.schemas.publications import (
    PublicationCreate, PublicationUpdate, PublicationStatus,
    ContentType, InlineKeyboard, AIGenerateRequest, AIEditRequest
)


class PublicationService:
    def __init__(self, db: AsyncSession, bot: Bot, openai_api_key: Optional[str] = None):
        self.db = db
        self.bot = bot
        self.openai_api_key = openai_api_key

    async def create_publication(self, data: PublicationCreate) -> Publication:
        publication = Publication(
            content_type=DBContentType[data.content_type.value.upper()],
            status=DBPublicationStatus.DRAFT,
            text_content=data.text_content,
            formatted_content=data.formatted_content,
            media_urls=data.media_urls,
            media_blur=data.media_blur,
            inline_keyboard=data.inline_keyboard.model_dump() if data.inline_keyboard else None,
            poll_data=data.poll_data.model_dump() if data.poll_data else None,
            pin_message=data.pin_message,
            auto_delete_hours=data.auto_delete_hours,
            scheduled_time=data.scheduled_time,
            timezone=data.timezone,
            series_id=data.series_id,
            series_order=data.series_order,
            ai_generated=bool(data.ai_prompt),
            ai_prompt=data.ai_prompt
        )

        if data.channel_ids:
            channels = await self.get_channels_by_ids(data.channel_ids)
            publication.channels = channels

        if data.tag_names:
            tags = await self.get_or_create_tags(data.tag_names)
            publication.tags = tags

        self.db.add(publication)
        await self.db.commit()
        await self.db.refresh(publication)
        
        return publication

    async def get_publication(self, publication_id: int) -> Optional[Publication]:
        query = select(Publication).where(Publication.id == publication_id).options(
            selectinload(Publication.channels),
            selectinload(Publication.tags),
            selectinload(Publication.series),
            selectinload(Publication.telegram_messages)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_publications(
        self,
        status: Optional[PublicationStatus] = None,
        content_type: Optional[ContentType] = None,
        channel_id: Optional[int] = None,
        tag_names: Optional[List[str]] = None,
        series_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[Publication], int]:
        query = select(Publication).options(
            selectinload(Publication.channels),
            selectinload(Publication.tags),
            selectinload(Publication.series)
        )

        filters = []
        if status:
            filters.append(Publication.status == DBPublicationStatus[status.value.upper()])
        if content_type:
            filters.append(Publication.content_type == DBContentType[content_type.value.upper()])
        if series_id:
            filters.append(Publication.series_id == series_id)
        if start_date:
            filters.append(Publication.scheduled_time >= start_date)
        if end_date:
            filters.append(Publication.scheduled_time <= end_date)

        if filters:
            query = query.where(and_(*filters))

        if channel_id:
            query = query.join(Publication.channels).where(Channel.id == channel_id)

        if tag_names:
            query = query.join(Publication.tags).where(Tag.name.in_(tag_names))

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query) or 0

        query = query.offset(skip).limit(limit).order_by(Publication.created_at.desc())
        result = await self.db.execute(query)
        publications = result.unique().scalars().all()

        return list(publications), total

    async def update_publication(self, publication_id: int, data: PublicationUpdate) -> Optional[Publication]:
        publication = await self.get_publication(publication_id)
        if not publication:
            return None

        update_data = data.model_dump(exclude_unset=True)
        
        if 'channel_ids' in update_data:
            channels = await self.get_channels_by_ids(update_data.pop('channel_ids'))
            publication.channels = channels

        if 'tag_names' in update_data:
            tags = await self.get_or_create_tags(update_data.pop('tag_names'))
            publication.tags = tags

        if 'inline_keyboard' in update_data and update_data['inline_keyboard']:
            update_data['inline_keyboard'] = update_data['inline_keyboard'].model_dump() if hasattr(update_data['inline_keyboard'], 'model_dump') else update_data['inline_keyboard']

        if 'poll_data' in update_data and update_data['poll_data']:
            update_data['poll_data'] = update_data['poll_data'].model_dump() if hasattr(update_data['poll_data'], 'model_dump') else update_data['poll_data']

        if 'content_type' in update_data:
            update_data['content_type'] = DBContentType[update_data['content_type'].value.upper()]

        if 'status' in update_data:
            update_data['status'] = DBPublicationStatus[update_data['status'].value.upper()]

        for key, value in update_data.items():
            setattr(publication, key, value)

        publication.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(publication)

        return publication

    async def delete_publication(self, publication_id: int) -> bool:
        publication = await self.get_publication(publication_id)
        if not publication:
            return False

        await self.db.delete(publication)
        await self.db.commit()
        return True

    async def publish_now(self, publication_id: int) -> Dict[str, Any]:
        publication = await self.get_publication(publication_id)
        if not publication:
            return {"success": False, "error": "Publication not found"}

        if not publication.channels:
            return {"success": False, "error": "No channels selected"}

        results = []
        for channel in publication.channels:
            try:
                message_id = await self.send_to_telegram(publication, channel)
                
                telegram_message = TelegramMessage(
                    publication_id=publication.id,
                    channel_id=channel.id,
                    telegram_message_id=message_id
                )
                self.db.add(telegram_message)

                if publication.pin_message:
                    await self.bot.pin_chat_message(chat_id=channel.telegram_id, message_id=message_id)

                results.append({"channel": channel.name, "success": True, "message_id": message_id})

                await self.create_notification(
                    publication.id,
                    "success",
                    f"Published to {channel.name}"
                )

            except Exception as e:
                results.append({"channel": channel.name, "success": False, "error": str(e)})
                await self.create_notification(
                    publication.id,
                    "error",
                    f"Failed to publish to {channel.name}",
                    {"error": str(e)}
                )

        publication.status = DBPublicationStatus.PUBLISHED
        publication.published_time = datetime.utcnow()
        await self.db.commit()

        return {"success": True, "results": results}

    async def send_to_telegram(self, publication: Publication, channel: Channel) -> int:
        keyboard = None
        if publication.inline_keyboard:
            keyboard = self.build_inline_keyboard(publication.inline_keyboard)

        if publication.content_type == DBContentType.TEXT:
            message = await self.bot.send_message(
                chat_id=channel.telegram_id,
                text=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML
            )
            return message.message_id

        elif publication.content_type == DBContentType.TEXT_WITH_MEDIA:
            if publication.media_urls and len(publication.media_urls) > 0:
                spoiler = publication.media_blur
                if len(publication.media_urls) == 1:
                    message = await self.bot.send_photo(
                        chat_id=channel.telegram_id,
                        photo=publication.media_urls[0],
                        caption=publication.text_content,
                        reply_markup=keyboard,
                        parse_mode=ParseMode.HTML,
                        has_spoiler=spoiler
                    )
                else:
                    media = [InputMediaPhoto(media=url, has_spoiler=spoiler) for url in publication.media_urls[:10]]
                    if publication.text_content:
                        media[0].caption = publication.text_content
                    messages = await self.bot.send_media_group(chat_id=channel.telegram_id, media=media)
                    message = messages[0]
            else:
                message = await self.bot.send_message(
                    chat_id=channel.telegram_id,
                    text=publication.text_content,
                    reply_markup=keyboard,
                    parse_mode=ParseMode.HTML
                )
            return message.message_id

        elif publication.content_type == DBContentType.IMAGE:
            message = await self.bot.send_photo(
                chat_id=channel.telegram_id,
                photo=publication.media_urls[0] if publication.media_urls else "",
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=publication.media_blur
            )
            return message.message_id

        elif publication.content_type == DBContentType.VIDEO:
            message = await self.bot.send_video(
                chat_id=channel.telegram_id,
                video=publication.media_urls[0] if publication.media_urls else "",
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=publication.media_blur
            )
            return message.message_id

        elif publication.content_type == DBContentType.AUDIO:
            message = await self.bot.send_audio(
                chat_id=channel.telegram_id,
                audio=publication.media_urls[0] if publication.media_urls else "",
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML
            )
            return message.message_id

        elif publication.content_type == DBContentType.DOCUMENT:
            message = await self.bot.send_document(
                chat_id=channel.telegram_id,
                document=publication.media_urls[0] if publication.media_urls else "",
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML
            )
            return message.message_id

        elif publication.content_type == DBContentType.LINK:
            message = await self.bot.send_message(
                chat_id=channel.telegram_id,
                text=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=False
            )
            return message.message_id

        elif publication.content_type in [DBContentType.POLL, DBContentType.QUIZ]:
            poll_data = publication.poll_data
            message = await self.bot.send_poll(
                chat_id=channel.telegram_id,
                question=poll_data['question'],
                options=poll_data['options'],
                is_anonymous=poll_data.get('is_anonymous', True),
                type='quiz' if publication.content_type == DBContentType.QUIZ else 'regular',
                allows_multiple_answers=poll_data.get('allows_multiple_answers', False),
                correct_option_id=poll_data.get('correct_option_id'),
                explanation=poll_data.get('explanation'),
                reply_markup=keyboard
            )
            return message.message_id

        return 0

    def build_inline_keyboard(self, keyboard_data: Dict) -> InlineKeyboardMarkup:
        keyboard = InlineKeyboardMarkup(inline_keyboard=[])
        for row in keyboard_data.get('buttons', []):
            button_row = []
            for btn in row:
                if btn.get('url'):
                    button_row.append(InlineKeyboardButton(text=btn['text'], url=btn['url']))
                elif btn.get('callback_data'):
                    button_row.append(InlineKeyboardButton(text=btn['text'], callback_data=btn['callback_data']))
            if button_row:
                keyboard.inline_keyboard.append(button_row)
        return keyboard

    async def get_channels_by_ids(self, channel_ids: List[int]) -> List[Channel]:
        query = select(Channel).where(Channel.id.in_(channel_ids))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_or_create_tags(self, tag_names: List[str]) -> List[Tag]:
        tags = []
        for name in tag_names:
            query = select(Tag).where(Tag.name == name)
            result = await self.db.execute(query)
            tag = result.scalar_one_or_none()
            
            if not tag:
                tag = Tag(name=name)
                self.db.add(tag)
                await self.db.flush()
            
            tags.append(tag)
        
        return tags

    async def create_notification(
        self,
        publication_id: int,
        status: str,
        message: str,
        error_details: Optional[Dict] = None
    ):
        notification = PublicationNotification(
            publication_id=publication_id,
            status=status,
            message=message,
            error_details=error_details
        )
        self.db.add(notification)
        await self.db.flush()

    async def get_calendar(self, year: int, month: int, timezone_str: str = "UTC") -> Dict[str, List[Publication]]:
        tz = pytz.timezone(timezone_str)
        start_date = datetime(year, month, 1, tzinfo=pytz.UTC)
        
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=pytz.UTC)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=pytz.UTC)

        query = select(Publication).where(
            and_(
                Publication.scheduled_time >= start_date,
                Publication.scheduled_time < end_date,
                Publication.status.in_([DBPublicationStatus.SCHEDULED, DBPublicationStatus.PUBLISHED])
            )
        ).options(
            selectinload(Publication.channels),
            selectinload(Publication.tags)
        ).order_by(Publication.scheduled_time)

        result = await self.db.execute(query)
        publications = result.scalars().all()

        calendar_dict = {}
        for pub in publications:
            pub_time = pub.scheduled_time.astimezone(tz)
            date_key = pub_time.strftime('%Y-%m-%d')
            if date_key not in calendar_dict:
                calendar_dict[date_key] = []
            calendar_dict[date_key].append(pub)

        return calendar_dict

    async def reschedule_publication(self, publication_id: int, new_time: datetime) -> Optional[Publication]:
        publication = await self.get_publication(publication_id)
        if not publication:
            return None

        publication.scheduled_time = new_time
        publication.status = DBPublicationStatus.SCHEDULED
        await self.db.commit()
        await self.db.refresh(publication)

        return publication

    async def generate_with_ai(self, request: AIGenerateRequest) -> str:
        if not self.openai_api_key:
            raise ValueError("AI API key not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {
                            "role": "system",
                            "content": f"You are a professional content creator for Telegram channels. Create content in {request.tone} tone. Maximum length: {request.max_length} characters. Write in Russian language."
                        },
                        {
                            "role": "user",
                            "content": request.prompt
                        }
                    ],
                    "max_tokens": request.max_length,
                    "temperature": 0.7
                },
                timeout=30.0
            )

        if response.status_code != 200:
            raise ValueError(f"DeepSeek API error: {response.text}")

        result = response.json()
        return result['choices'][0]['message']['content']

    async def edit_with_ai(self, request: AIEditRequest) -> Optional[Publication]:
        publication = await self.get_publication(request.publication_id)
        if not publication or not publication.text_content:
            return None

        if not self.openai_api_key:
            raise ValueError("AI API key not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional content editor for Telegram channels. Edit the content according to the instruction. Write in Russian language."
                        },
                        {
                            "role": "user",
                            "content": f"Original text: {publication.text_content}\n\nInstruction: {request.instruction}\n\nProvide only the edited text."
                        }
                    ],
                    "temperature": 0.7
                },
                timeout=30.0
            )

        if response.status_code != 200:
            raise ValueError(f"DeepSeek API error: {response.text}")

        result = response.json()
        edited_content = result['choices'][0]['message']['content']
        
        publication.text_content = edited_content
        publication.ai_generated = True
        await self.db.commit()
        await self.db.refresh(publication)

        return publication

    async def edit_published_message(self, publication_id: int, new_text: str) -> Dict[str, Any]:
        publication = await self.get_publication(publication_id)
        if not publication or publication.status != DBPublicationStatus.PUBLISHED:
            return {"success": False, "error": "Publication not found or not published"}

        results = []
        for tg_msg in publication.telegram_messages:
            try:
                await self.bot.edit_message_text(
                    chat_id=tg_msg.channel.telegram_id,
                    message_id=tg_msg.telegram_message_id,
                    text=new_text,
                    parse_mode=ParseMode.HTML
                )
                results.append({"channel": tg_msg.channel.name, "success": True})
            except Exception as e:
                results.append({"channel": tg_msg.channel.name, "success": False, "error": str(e)})

        publication.text_content = new_text
        await self.db.commit()

        return {"success": True, "results": results}

    async def delete_telegram_messages(self, publication_id: int) -> Dict[str, Any]:
        publication = await self.get_publication(publication_id)
        if not publication:
            return {"success": False, "error": "Publication not found"}

        results = []
        for tg_msg in publication.telegram_messages:
            try:
                await self.bot.delete_message(
                    chat_id=tg_msg.channel.telegram_id,
                    message_id=tg_msg.telegram_message_id
                )
                results.append({"channel": tg_msg.channel.name, "success": True})
            except Exception as e:
                results.append({"channel": tg_msg.channel.name, "success": False, "error": str(e)})

        publication.status = DBPublicationStatus.DELETED
        await self.db.commit()

        return {"success": True, "results": results}

    async def create_channel(self, telegram_id: str, name: str, username: Optional[str] = None) -> Channel:
        channel = Channel(telegram_id=telegram_id, name=name, username=username)
        self.db.add(channel)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def create_series(self, name: str, description: Optional[str] = None) -> PublicationSeries:
        series = PublicationSeries(name=name, description=description)
        self.db.add(series)
        await self.db.commit()
        await self.db.refresh(series)
        return series

