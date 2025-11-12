from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, func, delete, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
import pytz
import asyncio
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, InputMediaPhoto, InputMediaVideo, InputMediaDocument, InputMediaAudio, Message
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramRetryAfter, TelegramBadRequest
import httpx
import json
from backend.models.publications import (
    Publication, Tag, PublicationSeries,
    TelegramMessage, PublicationNotification,
    PublicationStatus as DBPublicationStatus,
    ContentType as DBContentType
)
from backend.models.channels import ChannelGroup as Channel, BackedUpPost, PostRetransmission, BackupMode
from backend.schemas.publications import (
    PublicationUpdate, PublicationStatus,
    ContentType, AIGenerateRequest, AIEditRequest, PublicationCreate
)
from backend.services.channel import ChannelService


class PublicationService:
    def __init__(self, db: AsyncSession, openai_api_key: Optional[str] = None):
        self.db = db
        self.openai_api_key = openai_api_key
        self.http_client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
        )
        self.telegram_semaphore = asyncio.Semaphore(10)
        self.channel_service = ChannelService(db=db)
    
    def create_bot(self, token: str) -> Bot:
        """Создать экземпляр Bot из токена"""
        return Bot(token=token)
    
    async def get_bot_for_channel(self, channel: Channel) -> Bot:
        """Получить бота для канала"""
        if not channel.bot or not channel.bot.token:
            raise ValueError(f"Channel {channel.id} does not have an associated bot")
        return self.create_bot(channel.bot.token)

    async def create_publication(self, data: PublicationCreate, owner_id: int) -> Publication:
        publication = Publication(
            owner_id=owner_id,
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
            channels = await self.get_channels_by_ids(data.channel_ids, owner_id=owner_id)
            if len(channels) != len(set(data.channel_ids)):
                raise ValueError("One or more channels not found or do not belong to the user")
            publication.channels = channels

        if data.tag_names:
            tags = await self.get_or_create_tags(data.tag_names)
            publication.tags = tags

        self.db.add(publication)
        await self.db.commit()
        await self.db.refresh(publication)
        
        return publication

    async def get_channels_by_ids(self, channel_ids: List[int], owner_id: Optional[int] = None) -> List[Channel]:
        query = select(Channel).options(selectinload(Channel.bot)).where(Channel.id.in_(channel_ids))
        if owner_id is not None:
            query = query.where(Channel.owner_id == owner_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_or_create_tags(self, tag_names: List[str]) -> List[Tag]:
        query = select(Tag).where(Tag.name.in_(tag_names))
        result = await self.db.execute(query)
        existing_tags = {tag.name: tag for tag in result.scalars().all()}

        tags = []
        new_tags = []

        for name in tag_names:
            if name in existing_tags:
                tags.append(existing_tags[name])
            else:
                new_tag = Tag(name=name)
                new_tags.append(new_tag)
                tags.append(new_tag)

        if new_tags:
            self.db.add_all(new_tags)
            try:
                await self.db.flush()
            except IntegrityError:
                await self.db.rollback()
                query = select(Tag).where(Tag.name.in_(tag_names))
                result = await self.db.execute(query)
                existing_tags = {tag.name: tag for tag in result.scalars().all()}
                tags = [existing_tags[name] for name in tag_names]

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

    async def get_publication(self, publication_id: int, owner_id: Optional[int] = None) -> Optional[Publication]:
        query = select(Publication).where(Publication.id == publication_id).options(
            selectinload(Publication.channels).selectinload(Channel.bot),
            selectinload(Publication.tags),
            selectinload(Publication.series),
            selectinload(Publication.telegram_messages)
            .selectinload(TelegramMessage.channel)
            .selectinload(Channel.bot)
        )
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_publications(
        self,
        owner_id: Optional[int] = None,
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
        base_query = select(Publication).options(
            selectinload(Publication.channels).selectinload(Channel.bot),
            selectinload(Publication.tags),
            selectinload(Publication.series)
        )

        if owner_id is not None:
            base_query = base_query.where(Publication.owner_id == owner_id)

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
            base_query = base_query.where(and_(*filters))

        if channel_id:
            base_query = base_query.join(Publication.channels).where(Channel.id == channel_id)

        if tag_names:
            base_query = base_query.join(Publication.tags).where(Tag.name.in_(tag_names))

        ordered_query = base_query.order_by(Publication.created_at.desc())

        count_query = select(func.count(distinct(Publication.id))).select_from(base_query.subquery())
        total = await self.db.scalar(count_query) or 0

        paginated_query = ordered_query.offset(skip).limit(limit)
        result = await self.db.execute(paginated_query)
        publications = result.unique().scalars().all()

        return list(publications), total

    async def update_publication(self, publication_id: int, data: PublicationUpdate, owner_id: Optional[int] = None) -> Optional[Publication]:
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return None

        update_data = data.model_dump(exclude_unset=True)
        
        if 'channel_ids' in update_data:
            channel_ids = update_data.pop('channel_ids')
            channels = await self.get_channels_by_ids(channel_ids, owner_id=owner_id)
            if owner_id is not None and channel_ids and len(channels) != len(set(channel_ids)):
                raise ValueError("One or more channels not found or do not belong to the user")
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

    async def delete_publication(self, publication_id: int, owner_id: Optional[int] = None) -> bool:
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return False

        await self.db.delete(publication)
        await self.db.commit()
        return True

    async def publish_now(self, publication_id: int, owner_id: Optional[int] = None) -> Dict[str, Any]:
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return {"success": False, "error": "Publication not found"}

        if not publication.channels:
            return {"success": False, "error": "No channels selected"}

        async def safe_send_to_channel(channel: Channel) -> Dict[str, Any]:
            channel_name = getattr(channel, "title", getattr(channel, "name", str(channel.telegram_id)))
            
            # Получаем бота для канала
            try:
                bot = await self.get_bot_for_channel(channel)
            except ValueError as e:
                await self.create_notification(
                    publication.id,
                    "error",
                    f"Failed to publish to {channel_name}: {str(e)}"
                )
                return {"channel": channel_name, "success": False, "error": str(e)}
            
            async with self.telegram_semaphore:
                for attempt in range(5):
                    try:
                        sent_messages = await self.send_to_telegram(publication, channel, bot)
                        message_ids: List[int] = []

                        for msg in sent_messages:
                            message_ids.append(msg.message_id)
                            telegram_message = TelegramMessage(
                                publication_id=publication.id,
                                channel_id=channel.id,
                                telegram_message_id=msg.message_id
                            )
                            self.db.add(telegram_message)

                        await self.db.flush()
                        await self.handle_instant_backup(channel, sent_messages, publication_id=publication.id)

                        if publication.pin_message and message_ids:
                            try:
                                await bot.pin_chat_message(
                                    chat_id=channel.telegram_id,
                                    message_id=message_ids[0]
                                )
                            except Exception:
                                pass

                        await self.create_notification(
                            publication.id,
                            "success",
                            f"Published to {channel_name}"
                        )

                        return {"channel": channel_name, "success": True, "message_ids": message_ids}

                    except TelegramRetryAfter as e:
                        if attempt < 4:
                            await asyncio.sleep(e.retry_after)
                        else:
                            await self.create_notification(
                                publication.id,
                                "error",
                                f"Failed to publish to {channel_name}: Rate limit",
                                {"error": str(e)}
                            )
                            return {"channel": channel_name, "success": False, "error": f"Rate limit: {e.retry_after}s"}

                    except Exception as e:
                        if attempt == 4:
                            await self.create_notification(
                                publication.id,
                                "error",
                                f"Failed to publish to {channel_name}",
                                {"error": str(e)}
                            )
                            return {"channel": channel_name, "success": False, "error": str(e)}
                        await asyncio.sleep(2 ** attempt)
            return None

        results: List[Dict[str, Any]] = []
        for channel in publication.channels:
            result = await safe_send_to_channel(channel)
            if result is not None:
                results.append(result)

        success_count = sum(1 for r in results if r.get("success"))
        total_count = len(results)

        if success_count == 0:
            publication.status = DBPublicationStatus.FAILED
        elif success_count == total_count:
            publication.status = DBPublicationStatus.PUBLISHED
            publication.published_time = datetime.now(timezone.utc)
        else:
            publication.status = DBPublicationStatus.PARTIAL_SUCCESS
            publication.published_time = datetime.now(timezone.utc)

        await self.db.commit()

        return {"success": success_count > 0, "results": results, "success_count": success_count, "total_count": total_count}


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

    async def send_to_telegram(self, publication: Publication, channel: Channel, bot: Bot) -> List[Message]:
        keyboard = None
        if publication.inline_keyboard:
            keyboard = self.build_inline_keyboard(publication.inline_keyboard)

        if publication.content_type == DBContentType.IMAGE and (not publication.media_urls or not publication.media_urls[0]):
            raise ValueError("media_urls is required for IMAGE content type")
        if publication.content_type == DBContentType.VIDEO and (not publication.media_urls or not publication.media_urls[0]):
            raise ValueError("media_urls is required for VIDEO content type")
        if publication.content_type == DBContentType.AUDIO and (not publication.media_urls or not publication.media_urls[0]):
            raise ValueError("media_urls is required for AUDIO content type")
        if publication.content_type == DBContentType.DOCUMENT and (not publication.media_urls or not publication.media_urls[0]):
            raise ValueError("media_urls is required for DOCUMENT content type")

        if publication.content_type == DBContentType.TEXT:
            message = await bot.send_message(
                chat_id=channel.telegram_id,
                text=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML
            )
            return [message]

        elif publication.content_type == DBContentType.TEXT_WITH_MEDIA:
            if publication.media_urls and len(publication.media_urls) > 0:
                spoiler = publication.media_blur
                if len(publication.media_urls) == 1:
                    message = await bot.send_photo(
                        chat_id=channel.telegram_id,
                        photo=publication.media_urls[0],
                        caption=publication.text_content,
                        reply_markup=keyboard,
                        parse_mode=ParseMode.HTML,
                        has_spoiler=spoiler
                    )
                    return [message]

                media = []
                for i, url in enumerate(publication.media_urls[:10]):
                    if i == 0 and publication.text_content:
                        media.append(InputMediaPhoto(
                            media=url,
                            caption=publication.text_content,
                            parse_mode=ParseMode.HTML,
                            has_spoiler=spoiler
                        ))
                    else:
                        media.append(InputMediaPhoto(
                            media=url,
                            has_spoiler=spoiler
                        ))
                messages = await bot.send_media_group(chat_id=channel.telegram_id, media=media)
                return list(messages)
            else:
                message = await bot.send_message(
                    chat_id=channel.telegram_id,
                    text=publication.text_content,
                    reply_markup=keyboard,
                    parse_mode=ParseMode.HTML
                )
            return [message]

        elif publication.content_type == DBContentType.IMAGE:
            message = await bot.send_photo(
                chat_id=channel.telegram_id,
                photo=publication.media_urls[0],
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=publication.media_blur
            )
            return [message]

        elif publication.content_type == DBContentType.VIDEO:
            message = await bot.send_video(
                chat_id=channel.telegram_id,
                video=publication.media_urls[0],
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                has_spoiler=publication.media_blur
            )
            return [message]

        elif publication.content_type == DBContentType.AUDIO:
            message = await bot.send_audio(
                chat_id=channel.telegram_id,
                audio=publication.media_urls[0],
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML
            )
            return [message]

        elif publication.content_type == DBContentType.DOCUMENT:
            message = await bot.send_document(
                chat_id=channel.telegram_id,
                document=publication.media_urls[0],
                caption=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML
            )
            return [message]

        elif publication.content_type == DBContentType.LINK:
            message = await bot.send_message(
                chat_id=channel.telegram_id,
                text=publication.text_content,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=False
            )
            return [message]

        elif publication.content_type in [DBContentType.POLL, DBContentType.QUIZ]:
            poll_data = publication.poll_data
            message = await bot.send_poll(
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
            return [message]

        raise ValueError("Unsupported content type")

    async def handle_instant_backup(
        self,
        channel: Channel,
        messages: List[Message],
        publication_id: int
    ) -> None:
        if channel.backup_mode != BackupMode.INSTANT:
            return

        try:
            for message in messages:
                await self.channel_service.save_post_backup(channel.id, message)
        except Exception as error:
            await self.create_notification(
                publication_id,
                "error",
                f"Instant backup failed for {getattr(channel, 'title', channel.telegram_id)}",
                {"error": str(error)}
            )

    async def get_calendar(self, year: int, month: int, timezone_str: str = "UTC", owner_id: Optional[int] = None) -> Dict[str, List[Publication]]:
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
        if owner_id is not None:
            query = query.where(Publication.owner_id == owner_id)

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

    async def reschedule_publication(self, publication_id: int, new_time: datetime, owner_id: Optional[int] = None) -> Optional[Publication]:
        publication = await self.get_publication(publication_id, owner_id=owner_id)
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

        response = await self.http_client.post(
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
            }
        )

        if response.status_code != 200:
            raise ValueError(f"DeepSeek API error: {response.text}")

        result = response.json()
        return result['choices'][0]['message']['content']

    async def edit_with_ai(self, request: AIEditRequest, owner_id: Optional[int] = None) -> Optional[Publication]:
        publication = await self.get_publication(request.publication_id, owner_id=owner_id)
        if not publication or not publication.text_content:
            return None

        if not self.openai_api_key:
            raise ValueError("AI API key not configured")

        response = await self.http_client.post(
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
            }
        )

        if response.status_code != 200:
            raise ValueError(f"DeepSeek API error: {response.text}")

        result = response.json()
        edited_content = result['choices'][0]['message']['content']
        
        publication.text_content = edited_content
        publication.ai_generated = True
        await self.db.commit()

        return publication

    async def edit_published_message(self, publication_id: int, new_text: str, owner_id: Optional[int] = None) -> Dict[str, Any]:
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication or publication.status not in [DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS]:
            return {"success": False, "error": "Publication not found or not published"}

        results = []
        for tg_msg in publication.telegram_messages:
            channel_label = getattr(tg_msg.channel, "title", getattr(tg_msg.channel, "name", str(tg_msg.channel.telegram_id)))
            try:
                bot = await self.get_bot_for_channel(tg_msg.channel)
                await bot.edit_message_text(
                    chat_id=tg_msg.channel.telegram_id,
                    message_id=tg_msg.telegram_message_id,
                    text=new_text,
                    parse_mode=ParseMode.HTML
                )
                results.append({"channel": channel_label, "success": True})
            except Exception as e:
                results.append({"channel": channel_label, "success": False, "error": str(e)})

        success_count = sum(1 for r in results if r.get("success"))
        
        if success_count > 0:
            publication.text_content = new_text
        
        await self.db.commit()
        await self.db.refresh(publication)

        return {"success": success_count > 0, "results": results, "success_count": success_count, "total_count": len(results)}

    async def delete_telegram_messages(self, publication_id: int, owner_id: Optional[int] = None) -> Dict[str, Any]:
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return {"success": False, "error": "Publication not found"}

        results = []
        for tg_msg in publication.telegram_messages:
            channel_label = getattr(tg_msg.channel, "title", getattr(tg_msg.channel, "name", str(tg_msg.channel.telegram_id)))
            try:
                bot = await self.get_bot_for_channel(tg_msg.channel)
                await bot.delete_message(
                    chat_id=tg_msg.channel.telegram_id,
                    message_id=tg_msg.telegram_message_id
                )
                results.append({"channel": channel_label, "success": True})
            except Exception as e:
                results.append({"channel": channel_label, "success": False, "error": str(e)})

        success_count = sum(1 for r in results if r.get("success"))
        
        if success_count == len(results):
            publication.status = DBPublicationStatus.DELETED
        
        await self.db.commit()

        return {"success": success_count > 0, "results": results, "success_count": success_count, "total_count": len(results)}


    async def create_series(self, name: str, description: Optional[str] = None) -> PublicationSeries:
        series = PublicationSeries(name=name, description=description)
        self.db.add(series)
        await self.db.commit()
        await self.db.refresh(series)
        return series

    async def retransmit_post(
        self,
        original_post: BackedUpPost,
        target_channel_id: int
    ) -> PostRetransmission:
        return await self.channel_service.retransmit_post(
            original_post=original_post,
            target_channel_id=target_channel_id
        )

