from fastapi import HTTPException
from backend.services.publications.telegram_sender import send_to_telegram
from typing import Callable, Awaitable, Optional, List
from sqlalchemy import select
from sqlalchemy.sql import nullslast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from backend.models.publications import (
    Publication, PublicationSeries, TelegramMessage,
    PublicationStatus as DBPublicationStatus,
)
from backend.models.channels import ChannelGroup
from backend.schemas.publications.series import PublicationSeriesUpdate
from backend.schemas.publications import PublishResult, ChannelPublishResult
from backend.services.telegram_client import RateLimitedBot


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
        await self.db.flush()
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

    async def update_series(
        self,
        series_id: int,
        update_data: PublicationSeriesUpdate
    ) -> PublicationSeries:
        """Обновить серию публикаций"""
        series = await self.get_series(series_id)
        if not series:
            raise HTTPException(status_code=404, detail="Series not found")
        
        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(series, field, value)
            
        await self.db.flush()
        await self.db.refresh(series)
        return series

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

    async def get_reply_to_message_id(
        self,
        series_id: int,
        channel_id: int
    ) -> Optional[int]:
        """Получить telegram_message_id последнего опубликованного поста серии в канале."""

        query = (
            select(TelegramMessage.telegram_message_id)
            .join(Publication, Publication.id == TelegramMessage.publication_id)
            .where(
                Publication.series_id == series_id,
                Publication.status == DBPublicationStatus.PUBLISHED,
                TelegramMessage.channel_id == channel_id,
            )
            .order_by(
                nullslast(Publication.series_order.desc()),
                nullslast(Publication.published_time.desc()),
                Publication.id.desc(),
                TelegramMessage.id.desc(),
            )
            .limit(1)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def publish_series_post(
        self,
        publication: Publication,
        bot_resolver: Callable[[ChannelGroup], Awaitable[RateLimitedBot]],
    ) -> PublishResult:
        """Опубликовать пост из серии с резолвом бота по каналу."""
        if not publication.series_id:
            raise HTTPException(status_code=400, detail="Publication must belong to a series")

        if not publication.channels:
            raise HTTPException(status_code=400, detail="No channels selected for publication")

        series = await self.get_series(publication.series_id)
        if not series:
            raise HTTPException(status_code=404, detail="Series not found")

        results: List[ChannelPublishResult] = []

        for channel in publication.channels:
            try:
                bot = await bot_resolver(channel)
                reply_to_id = None

                if series.reply_to_previous:
                    reply_to_id = await self.get_reply_to_message_id(
                        publication.series_id,
                        channel.id
                    )

                if reply_to_id and series.reply_to_previous:
                    sent_messages = await send_to_telegram(
                        publication,
                        channel,
                        bot,
                        reply_to_message_id=reply_to_id,
                    )
                else:
                    sent_messages = await send_to_telegram(publication, channel, bot)
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
                results.append(
                    ChannelPublishResult(
                        channel=channel_name,
                        success=True,
                        message_ids=message_ids,
                        replied_to=reply_to_id,
                    )
                )

            except Exception as e:
                channel_name = getattr(channel, "title", getattr(
                    channel, "name", str(channel.telegram_id)))
                results.append(
                    ChannelPublishResult(
                        channel=channel_name,
                        success=False,
                        error=str(e),
                        replied_to=reply_to_id,
                    )
                )

        success_count = sum(1 for r in results if r.success)

        if success_count > 0:
            publication.status = DBPublicationStatus.PUBLISHED
            publication.published_time = datetime.now(timezone.utc)
        else:
            publication.status = DBPublicationStatus.FAILED

        await self.db.flush()

        return PublishResult(
            success=success_count > 0,
            results=results,
            success_count=success_count,
            total_count=len(results),
            publication_id=publication.id,
        )
