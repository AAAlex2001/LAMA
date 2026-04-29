"""Публикация одного поста серии: отправка во все каналы + reply-цепочка + handle_backups."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Awaitable, Callable, List, Optional

from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError, TelegramNotFound
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import nullslast

from backend.models.channels import ChannelGroup
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    TelegramMessage,
)
from backend.schemas.publications import ChannelPublishResult, PublishResult
from backend.services.publications.features.publishing.handle_backups import handle_backups
from backend.services.publications.features.publishing.send_to_telegram import send_to_telegram
from backend.services.publications.features.series.lookup import find_series_or_404
from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


class PublishSeriesPost:
    """Параллельная публикация поста серии во все каналы; поддерживает reply-цепочку."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        publication: Publication,
        bot_resolver: Callable[[ChannelGroup], Awaitable[RateLimitedBot]],
    ) -> PublishResult:
        if not publication.series_id:
            raise HTTPException(status_code=400, detail="Publication must belong to a series")
        if not publication.channels:
            raise HTTPException(status_code=400, detail="No channels selected for publication")

        series = await find_series_or_404(self.db, publication.series_id)

        send_jobs, results = await prepare_send_jobs(self.db, publication, series, bot_resolver)
        gather_results = await asyncio.gather(*send_jobs, return_exceptions=True)
        results.extend(collect_send_results(gather_results))

        persist_telegram_messages(self.db, publication, results)
        success_count = update_publication_status(publication, results)
        await self.db.flush()

        await handle_backups(
            results, publication, self.db,
            silent_notification_callback,
        )

        return PublishResult(
            success=success_count > 0,
            results=results,
            success_count=success_count,
            total_count=len(results),
            publication_id=publication.id,
        )


async def prepare_send_jobs(
    db: AsyncSession,
    publication: Publication,
    series,
    bot_resolver,
) -> tuple[list, List[ChannelPublishResult]]:
    """Резолвит ботов и reply-id; возвращает корутины-отправители + ранние FAILED-результаты."""
    coros: list = []
    early_failures: List[ChannelPublishResult] = []

    for channel in publication.channels:
        channel_name = channel_display_name(channel)
        try:
            bot = await bot_resolver(channel)
        except ValueError as exc:
            early_failures.append(ChannelPublishResult(
                channel=channel_name, success=False, error=str(exc),
            ))
            continue

        reply_to_id = None
        if series.reply_to_previous:
            reply_to_id = await get_reply_to_message_id(
                db, publication.series_id, channel.id,
            )

        coros.append(send_to_channel(publication, channel, bot, reply_to_id, channel_name))

    return coros, early_failures


def collect_send_results(gather_results: list) -> List[ChannelPublishResult]:
    """Конвертирует исключения из gather в FAILED-результаты."""
    out: List[ChannelPublishResult] = []
    for result in gather_results:
        if isinstance(result, BaseException):
            logger.error("Unexpected exception in series gather: %s", result)
            out.append(ChannelPublishResult(
                channel="unknown", success=False, error=str(result),
            ))
        else:
            out.append(result)
    return out


def persist_telegram_messages(
    db: AsyncSession,
    publication: Publication,
    results: List[ChannelPublishResult],
) -> None:
    """TelegramMessage для всех успешных отправок (вне gather — AsyncSession не share-able)."""
    for r in results:
        if not (r.success and r.message_ids and r.channel_obj):
            continue
        db.add_all([
            TelegramMessage(
                publication_id=publication.id,
                channel_id=r.channel_obj.id,
                telegram_message_id=msg_id,
            )
            for msg_id in r.message_ids
        ])


def update_publication_status(
    publication: Publication, results: List[ChannelPublishResult],
) -> int:
    """PUBLISHED при ≥1 успехе, иначе FAILED. Возвращает success_count."""
    success_count = sum(1 for r in results if r.success)
    if success_count > 0:
        publication.status = DBPublicationStatus.PUBLISHED
        publication.published_time = datetime.now(timezone.utc)
    else:
        publication.status = DBPublicationStatus.FAILED
    return success_count


async def get_reply_to_message_id(
    db: AsyncSession, series_id: int, channel_id: int,
) -> Optional[int]:
    """telegram_message_id последнего опубликованного поста серии в канале."""
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
    return (await db.execute(query)).scalar_one_or_none()


async def send_to_channel(
    publication: Publication,
    channel: ChannelGroup,
    bot: RateLimitedBot,
    reply_to_id: Optional[int],
    channel_name: str,
) -> ChannelPublishResult:
    """Отправка в один канал; ошибки → FAILED-результат."""
    try:
        sent = await send_to_telegram(
            publication, channel, bot, reply_to_message_id=reply_to_id,
        )
        if not sent:
            raise RuntimeError("No messages returned from send_to_telegram")
        return ChannelPublishResult(
            channel=channel_name,
            success=True,
            message_ids=[m.message_id for m in sent],
            replied_to=reply_to_id,
            channel_obj=channel,
            sent_messages=sent,
        )
    except (TelegramBadRequest, TelegramForbiddenError, TelegramNotFound) as exc:
        logger.warning("Fatal Telegram error in series for %s: %s", channel_name, exc)
        return ChannelPublishResult(
            channel=channel_name, success=False,
            error=str(exc), replied_to=reply_to_id,
        )
    except RateLimitTimeout as exc:
        logger.info("Rate limit timeout for series channel %s: %s", channel_name, exc)
        return ChannelPublishResult(
            channel=channel_name, success=False,
            error=f"Rate limit timeout: {exc.wait_seconds:.0f}s",
            replied_to=reply_to_id,
        )
    except Exception as exc:
        logger.error("Error sending series to %s: %s", channel_name, exc)
        return ChannelPublishResult(
            channel=channel_name, success=False,
            error=str(exc), replied_to=reply_to_id,
        )


def channel_display_name(channel: ChannelGroup) -> str:
    """Лучший доступный текстовый идентификатор канала."""
    return getattr(channel, "title", None) or getattr(channel, "name", None) or str(channel.telegram_id)


async def silent_notification_callback(pub_id, level, msg, extra=None) -> None:
    """No-op callback (серии не пишут notification'ы при backup-операциях)."""
    return None
