from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import pytz
import asyncio
import os

from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, InputMediaPhoto, InputMediaVideo, InputMediaDocument, InputMediaAudio, Message
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramRetryAfter

from backend.models.publications import (
    Publication, TelegramMessage,
    PublicationStatus as DBPublicationStatus,
    ContentType as DBContentType
)
from backend.models.channels import ChannelGroup as Channel, BackupMode
from backend.schemas.publications import AIGenerateRequest, AIEditRequest, EditPublishedRequest
from backend.services.channel import ChannelService
from backend.services.publications.CRUD_publications import CRUDPublicationService
from backend.services.publications.ai_service import AIService
from backend.services.telegram_client import RateLimitedBot
from backend.config import get_bot


class PublicationService:
    """Сервис публикаций: Telegram API + AI + оркестрация"""

    def __init__(self, db: AsyncSession, openai_api_key: Optional[str] = None):
        self.db = db
        self.crud = CRUDPublicationService(db)
        self.ai_service = AIService(api_key=openai_api_key)
        self.channel_service = ChannelService(db=db)

    def get_master_bot(self) -> RateLimitedBot:
        """Получить мастер-бота для публикаций (с rate limiting)"""
        return get_bot()

    async def get_bot_for_channel(self, channel: Channel) -> RateLimitedBot:
        """Получить мастер-бота для публикаций в канал (с rate limiting)"""
        return get_bot()

    # ========================================================================
    # Проксирование CRUD методов
    # ========================================================================

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

    # ========================================================================
    # AI методы
    # ========================================================================

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

    # ========================================================================
    # Публикация в Telegram
    # ========================================================================

    async def publish_now(self, publication_id: int, owner_id: Optional[int] = None) -> Dict[str, Any]:
        """Опубликовать сейчас"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return {"success": False, "error": "Publication not found"}

        if not publication.channels:
            return {"success": False, "error": "No channels selected"}

        # Если публикация в серии с включённым reply_to_previous — используем SeriesService
        if publication.series_id and publication.series:
            if publication.series.reply_to_previous:
                from backend.services.publications.series_service import SeriesService
                series_service = SeriesService(self.db)
                bot = self.get_master_bot()
                return await series_service.publish_series_post(publication, bot)

        async def safe_send_to_channel(channel: Channel) -> Dict[str, Any]:
            channel_name = getattr(channel, "title", getattr(channel, "name", str(channel.telegram_id)))

            try:
                bot = await self.get_bot_for_channel(channel)
            except ValueError as e:
                await self.create_notification(
                    publication.id,
                    "error",
                    f"Failed to publish to {channel_name}: {str(e)}"
                )
                return {"channel": channel_name, "success": False, "error": str(e)}

            for attempt in range(5):
                try:
                    # Rate limiting управляется через RateLimitedBot
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
        """Построить inline клавиатуру"""
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

    async def send_to_telegram(self, publication: Publication, channel: Channel, bot: RateLimitedBot) -> List[Message]:
        """Отправить публикацию в Telegram"""
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
                    single_url = publication.media_urls[0]
                    is_video = single_url.lower().endswith((".mp4", ".mov", ".m4v", ".webm"))
                    if is_video:
                        message = await bot.send_video(
                            chat_id=channel.telegram_id,
                            video=single_url,
                            caption=publication.text_content,
                            reply_markup=keyboard,
                            parse_mode=ParseMode.HTML,
                            has_spoiler=spoiler
                        )
                        return [message]
                    else:
                        message = await bot.send_photo(
                            chat_id=channel.telegram_id,
                            photo=single_url,
                            caption=publication.text_content,
                            reply_markup=keyboard,
                            parse_mode=ParseMode.HTML,
                            has_spoiler=spoiler
                        )
                        return [message]

                # Медиальбом (фото+видео)
                media = []

                def is_video_url(u: str) -> bool:
                    return u.lower().endswith((".mp4", ".mov", ".m4v", ".webm"))

                urls = publication.media_urls[:10]
                for i, url in enumerate(urls):
                    if i == 0 and publication.text_content:
                        if is_video_url(url):
                            media.append(InputMediaVideo(
                                media=url,
                                caption=publication.text_content,
                                parse_mode=ParseMode.HTML,
                                has_spoiler=spoiler
                            ))
                        else:
                            media.append(InputMediaPhoto(
                                media=url,
                                caption=publication.text_content,
                                parse_mode=ParseMode.HTML,
                                has_spoiler=spoiler
                            ))
                    else:
                        if is_video_url(url):
                            media.append(InputMediaVideo(
                                media=url,
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
        """Обработать бекап и при необходимости мгновенную ретрансляцию"""
        if channel.backup_mode == BackupMode.DISABLED:
            return

        try:
            for message in messages:
                backed_up_post = await self.channel_service.save_post_backup(channel.id, message)

                if (
                    channel.backup_mode == BackupMode.INSTANT
                    and channel.backup_target_id
                    and channel.backup_target_id != channel.id
                ):
                    await self.channel_service.retransmit_post(
                        backed_up_post,
                        channel.backup_target_id
                    )
        except Exception as error:
            await self.create_notification(
                publication_id,
                "error",
                f"Instant backup failed for {getattr(channel, 'title', channel.telegram_id)}",
                {"error": str(error)}
            )

    # ========================================================================
    # Редактирование опубликованного
    # ========================================================================

    async def edit_published_message(
        self,
        publication_id: int,
        request: EditPublishedRequest,
        owner_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Редактировать уже опубликованное сообщение"""
        publication = await self.get_publication(publication_id, owner_id=owner_id)
        if not publication:
            return {"success": False, "error": "Publication not found"}

        if not publication.telegram_messages:
            return {"success": False, "error": "No Telegram messages found for publication"}

        if publication.content_type in [DBContentType.POLL, DBContentType.QUIZ]:
            return {
                "success": False,
                "error": "Editing poll or quiz messages via Telegram API is not supported"
            }

        if (
            publication.content_type == DBContentType.TEXT_WITH_MEDIA
            and publication.media_urls
            and len(publication.media_urls) > 1
        ):
            return {
                "success": False,
                "error": "Editing media albums is not supported by the Telegram Bot API"
            }

        new_text = (
            request.text_content
            if request.text_content is not None
            else publication.text_content
        )

        requested_media = request.media_urls if request.media_urls is not None else publication.media_urls

        inline_keyboard_data: Optional[Dict[str, Any]]
        if request.inline_keyboard is not None:
            inline_keyboard_data = (
                request.inline_keyboard.model_dump()
                if hasattr(request.inline_keyboard, "model_dump")
                else request.inline_keyboard
            )
        else:
            inline_keyboard_data = publication.inline_keyboard

        reply_markup = (
            self.build_inline_keyboard(inline_keyboard_data)
            if inline_keyboard_data
            else None
        )

        results = []

        for tg_msg in publication.telegram_messages:
            bot = None
            channel_label = getattr(tg_msg.channel, "title", getattr(tg_msg.channel, "name", str(tg_msg.channel.telegram_id)))
            try:
                bot = await self.get_bot_for_channel(tg_msg.channel)

                if publication.content_type in [DBContentType.TEXT, DBContentType.LINK]:
                    if new_text is None:
                        raise ValueError("text_content must be provided for text publications")
                    await bot.edit_message_text(
                        chat_id=tg_msg.channel.telegram_id,
                        message_id=tg_msg.telegram_message_id,
                        text=new_text,
                        parse_mode=ParseMode.HTML,
                        reply_markup=reply_markup
                    )

                elif publication.content_type in [
                    DBContentType.IMAGE,
                    DBContentType.VIDEO,
                    DBContentType.AUDIO,
                    DBContentType.DOCUMENT,
                    DBContentType.TEXT_WITH_MEDIA
                ]:
                    if request.media_urls is not None and not request.media_urls:
                        raise ValueError("media_urls cannot be empty when provided")

                    media_url = None
                    if requested_media:
                        if len(requested_media) > 1:
                            raise ValueError("Only one media item can be edited at a time")
                        media_url = requested_media[0]

                    caption_value = new_text if new_text is not None else publication.text_content

                    can_use_caption_edit = (
                        media_url is None or (publication.media_urls and media_url == publication.media_urls[0])
                    )

                    if request.media_urls is None and can_use_caption_edit:
                        await bot.edit_message_caption(
                            chat_id=tg_msg.channel.telegram_id,
                            message_id=tg_msg.telegram_message_id,
                            caption=caption_value or "",
                            parse_mode=ParseMode.HTML,
                            reply_markup=reply_markup
                        )
                    else:
                        if media_url is None:
                            if not publication.media_urls:
                                raise ValueError("Original media is missing and no replacement provided")
                            media_url = publication.media_urls[0]

                        media_input = None
                        if publication.content_type in [DBContentType.IMAGE, DBContentType.TEXT_WITH_MEDIA]:
                            media_input = InputMediaPhoto(
                                media=media_url,
                                caption=caption_value or "",
                                parse_mode=ParseMode.HTML,
                                has_spoiler=publication.media_blur
                            )
                        elif publication.content_type == DBContentType.VIDEO:
                            media_input = InputMediaVideo(
                                media=media_url,
                                caption=caption_value or "",
                                parse_mode=ParseMode.HTML,
                                has_spoiler=publication.media_blur
                            )
                        elif publication.content_type == DBContentType.AUDIO:
                            media_input = InputMediaAudio(
                                media=media_url,
                                caption=caption_value or "",
                                parse_mode=ParseMode.HTML
                            )
                        elif publication.content_type == DBContentType.DOCUMENT:
                            media_input = InputMediaDocument(
                                media=media_url,
                                caption=caption_value or "",
                                parse_mode=ParseMode.HTML
                            )
                        else:
                            raise ValueError("Unsupported media type for editing")

                        await bot.edit_message_media(
                            chat_id=tg_msg.channel.telegram_id,
                            message_id=tg_msg.telegram_message_id,
                            media=media_input,
                            reply_markup=reply_markup
                        )

                results.append({"channel": channel_label, "success": True})
            except Exception as e:
                results.append({"channel": channel_label, "success": False, "error": str(e)})

        success_count = sum(1 for r in results if r.get("success"))

        if success_count > 0:
            if request.text_content is not None:
                publication.text_content = request.text_content
            if request.inline_keyboard is not None:
                publication.inline_keyboard = (
                    request.inline_keyboard.model_dump()
                    if request.inline_keyboard
                    else None
                )
            if request.media_urls is not None:
                publication.media_urls = request.media_urls
            publication.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(publication)
        else:
            await self.db.rollback()

        return {"success": success_count > 0, "results": results, "success_count": success_count, "total_count": len(results)}

    async def delete_telegram_messages(self, publication_id: int, owner_id: Optional[int] = None) -> Dict[str, Any]:
        """Удалить опубликованные сообщения из Telegram"""
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

    async def retransmit_post(self, original_post, target_channel_id: int):
        """Ретранслировать пост"""
        return await self.channel_service.retransmit_post(
            original_post=original_post,
            target_channel_id=target_channel_id
        )

