from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from aiogram import Bot
from aiogram.types import Message
from aiogram.enums import ParseMode

from backend.models.publications import (
    Publication, PublicationSeries, TelegramMessage,
    PublicationStatus as DBPublicationStatus
)
from backend.models.channels import ChannelGroup as Channel


class SeriesService:
    """Сервис для работы с сериями публикаций (threads)"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_series(
        self,
        name: str,
        description: Optional[str] = None,
        reply_to_previous: bool = True
    ) -> PublicationSeries:
        """Создать серию публикаций"""
        series = PublicationSeries(
            name=name,
            description=description,
            reply_to_previous=reply_to_previous
        )
        self.db.add(series)
        await self.db.commit()
        await self.db.refresh(series)
        return series

    async def get_series(self, series_id: int) -> Optional[PublicationSeries]:
        """Получить серию по ID"""
        query = select(PublicationSeries).where(PublicationSeries.id == series_id).options(
            selectinload(PublicationSeries.publications)
            .selectinload(Publication.telegram_messages)
            .selectinload(TelegramMessage.channel)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_series_publications(
        self,
        series_id: int,
        order_by_series_order: bool = True
    ) -> List[Publication]:
        """Получить все публикации серии в порядке series_order"""
        query = select(Publication).where(Publication.series_id == series_id).options(
            selectinload(Publication.telegram_messages).selectinload(
                TelegramMessage.channel),
            selectinload(Publication.channels)
        )

        if order_by_series_order:
            query = query.order_by(Publication.series_order.asc())
        else:
            query = query.order_by(Publication.created_at.asc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_root_published_in_series(
        self,
        series_id: int,
        channel_id: int
    ) -> Optional[Publication]:
        """Получить корневую (первую) опубликованную публикацию серии для канала.

        Важно: все последующие посты серии будут отвечать именно на неё,
        чтобы получилась ветка с одним "родителем".
        """
        query = (
            select(Publication)
            .where(
                Publication.series_id == series_id,
                Publication.status == DBPublicationStatus.PUBLISHED,
            )
            .options(
                selectinload(Publication.telegram_messages).selectinload(
                    TelegramMessage.channel
                )
            )
            .order_by(Publication.series_order.asc())
        )
        query = query.join(Publication.telegram_messages).where(
            TelegramMessage.channel_id == channel_id
        )

        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_reply_to_message_id(
        self,
        series_id: int,
        channel_id: int
    ) -> Optional[int]:
        """Получить message_id корневого поста серии в канале для reply"""
        root_pub = await self.get_root_published_in_series(series_id, channel_id)

        if not root_pub or not root_pub.telegram_messages:
            return None

        # Ищем сообщение именно в этом канале
        for tg_msg in root_pub.telegram_messages:
            if tg_msg.channel_id == channel_id:
                return tg_msg.telegram_message_id

        return None

    async def send_as_reply(
        self,
        bot: Bot,
        channel: Channel,
        publication: Publication,
        reply_to_message_id: int,
        reply_markup=None
    ) -> List[Message]:
        """Отправить публикацию как ответ на предыдущее сообщение"""

        from backend.models.publications import ContentType as DBContentType

        if publication.content_type == DBContentType.TEXT:
            message = await bot.send_message(
                chat_id=channel.telegram_id,
                text=publication.text_content,
                reply_to_message_id=reply_to_message_id,
                parse_mode=ParseMode.HTML,
                reply_markup=reply_markup
            )
            return [message]

        elif publication.content_type == DBContentType.IMAGE:
            message = await bot.send_photo(
                chat_id=channel.telegram_id,
                photo=publication.media_urls[0],
                caption=publication.text_content,
                reply_to_message_id=reply_to_message_id,
                parse_mode=ParseMode.HTML,
                has_spoiler=publication.media_blur,
                reply_markup=reply_markup
            )
            return [message]

        elif publication.content_type == DBContentType.VIDEO:
            message = await bot.send_video(
                chat_id=channel.telegram_id,
                video=publication.media_urls[0],
                caption=publication.text_content,
                reply_to_message_id=reply_to_message_id,
                parse_mode=ParseMode.HTML,
                has_spoiler=publication.media_blur,
                reply_markup=reply_markup
            )
            return [message]

        elif publication.content_type == DBContentType.AUDIO:
            message = await bot.send_audio(
                chat_id=channel.telegram_id,
                audio=publication.media_urls[0],
                caption=publication.text_content,
                reply_to_message_id=reply_to_message_id,
                parse_mode=ParseMode.HTML,
                reply_markup=reply_markup
            )
            return [message]

        elif publication.content_type == DBContentType.DOCUMENT:
            message = await bot.send_document(
                chat_id=channel.telegram_id,
                document=publication.media_urls[0],
                caption=publication.text_content,
                reply_to_message_id=reply_to_message_id,
                parse_mode=ParseMode.HTML,
                reply_markup=reply_markup
            )
            return [message]

        elif publication.content_type == DBContentType.LINK:
            message = await bot.send_message(
                chat_id=channel.telegram_id,
                text=publication.text_content,
                reply_to_message_id=reply_to_message_id,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=False,
                reply_markup=reply_markup
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
                            reply_to_message_id=reply_to_message_id,
                            parse_mode=ParseMode.HTML,
                            has_spoiler=spoiler,
                            reply_markup=reply_markup
                        )
                    else:
                        message = await bot.send_photo(
                            chat_id=channel.telegram_id,
                            photo=single_url,
                            caption=publication.text_content,
                            reply_to_message_id=reply_to_message_id,
                            parse_mode=ParseMode.HTML,
                            has_spoiler=spoiler,
                            reply_markup=reply_markup
                        )
                    return [message]
                messages = []
                if publication.text_content:
                    text_msg = await bot.send_message(
                        chat_id=channel.telegram_id,
                        text=publication.text_content,
                        reply_to_message_id=reply_to_message_id,
                        parse_mode=ParseMode.HTML
                    )
                    messages.append(text_msg)

                from aiogram.types import InputMediaPhoto, InputMediaVideo
                media = []

                def is_video_url(u: str) -> bool:
                    return u.lower().endswith((".mp4", ".mov", ".m4v", ".webm"))

                urls = publication.media_urls[:10]
                for url in urls:
                    if is_video_url(url):
                        media.append(InputMediaVideo(
                            media=url, has_spoiler=spoiler))
                    else:
                        media.append(InputMediaPhoto(
                            media=url, has_spoiler=spoiler))

                media_msgs = await bot.send_media_group(chat_id=channel.telegram_id, media=media)
                messages.extend(list(media_msgs))
                return messages
            else:
                message = await bot.send_message(
                    chat_id=channel.telegram_id,
                    text=publication.text_content,
                    reply_to_message_id=reply_to_message_id,
                    parse_mode=ParseMode.HTML,
                    reply_markup=reply_markup
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
                allows_multiple_answers=poll_data.get(
                    'allows_multiple_answers', False),
                correct_option_id=poll_data.get('correct_option_id'),
                explanation=poll_data.get('explanation'),
                reply_to_message_id=reply_to_message_id,
                reply_markup=reply_markup
            )
            return [message]

        raise ValueError(
            f"Unsupported content type: {publication.content_type}")

    async def publish_series_post(
        self,
        publication: Publication,
        bot: Bot
    ) -> Dict[str, Any]:
        """
        Опубликовать пост из серии.
        Если series.reply_to_previous=True и есть предыдущий пост, отправит как ответ.
        """
        if not publication.series_id:
            raise ValueError("Publication must belong to a series")

        if not publication.channels:
            raise ValueError("No channels selected for publication")

        series = await self.get_series(publication.series_id)
        if not series:
            raise ValueError("Series not found")

        results = []

        for channel in publication.channels:
            try:
                reply_to_id = None

                if series.reply_to_previous:
                    reply_to_id = await self.get_reply_to_message_id(
                        publication.series_id,
                        channel.id
                    )

                reply_markup = None
                if publication.inline_keyboard:
                    from backend.services.publications.publications import PublicationService
                    reply_markup = PublicationService(
                        self.db).build_inline_keyboard(publication.inline_keyboard)

                if reply_to_id and series.reply_to_previous:
                    sent_messages = await self.send_as_reply(
                        bot=bot,
                        channel=channel,
                        publication=publication,
                        reply_to_message_id=reply_to_id,
                        reply_markup=reply_markup
                    )
                else:
                    from backend.services.publications.publications import PublicationService
                    pub_service = PublicationService(self.db)
                    sent_messages = await pub_service.send_to_telegram(publication, channel, bot)

                message_ids = []
                for msg in sent_messages:
                    message_ids.append(msg.message_id)
                    telegram_message = TelegramMessage(
                        publication_id=publication.id,
                        channel_id=channel.id,
                        telegram_message_id=msg.message_id
                    )
                    self.db.add(telegram_message)

                await self.db.flush()

                channel_name = getattr(channel, "title", getattr(
                    channel, "name", str(channel.telegram_id)))
                results.append({
                    "channel": channel_name,
                    "success": True,
                    "message_ids": message_ids,
                    "replied_to": reply_to_id
                })

            except Exception as e:
                channel_name = getattr(channel, "title", getattr(
                    channel, "name", str(channel.telegram_id)))
                results.append({
                    "channel": channel_name,
                    "success": False,
                    "error": str(e)
                })

        success_count = sum(1 for r in results if r.get("success"))

        if success_count > 0:
            publication.status = DBPublicationStatus.PUBLISHED
            publication.published_time = datetime.now(timezone.utc)
            await self.db.commit()
        else:
            publication.status = DBPublicationStatus.FAILED
            await self.db.commit()

        return {
            "success": success_count > 0,
            "results": results,
            "success_count": success_count,
            "total_count": len(results)
        }
