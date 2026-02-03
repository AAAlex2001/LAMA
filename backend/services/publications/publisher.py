from datetime import datetime, timezone
from typing import List, Dict, Any
import asyncio
import time
import logging

from aiogram.exceptions import TelegramRetryAfter
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication, TelegramMessage,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval
)
from backend.models.channels import ChannelGroup as Channel, BackupMode
from backend.schemas.publications import PublishResult, ChannelPublishResult
from backend.services.telegram_client import RateLimitedBot
from backend.services.publications.telegram_sender import send_to_telegram
from backend.services.channel import ChannelService

logger = logging.getLogger(__name__)

BATCH_SIZE = 5
MAX_RETRY_ATTEMPTS = 5
LARGE_RETRY_AFTER_THRESHOLD = 60


async def publish_to_channels(
    publication: Publication,
    db: AsyncSession,
    channel_service: ChannelService,
    get_bot_callback,
    create_notification_callback,
    calculate_next_repeat_time_callback
) -> PublishResult:
    """Опубликовать во все каналы публикации батчами"""
    
    publish_start = time.monotonic()
    logger.info(f"publish_now START publication_id={publication.id}")
    logger.info(f"Batched send to {len(publication.channels)} channels")

    results: List[ChannelPublishResult] = []

    for batch_start in range(0, len(publication.channels), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(publication.channels))
        batch_channels = publication.channels[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1

        batch_results = await process_batch(
            publication,
            batch_channels,
            batch_num,
            get_bot_callback
        )
        results.extend(batch_results)

        if batch_end < len(publication.channels):
            await asyncio.sleep(0.5)

    await save_telegram_messages(results, db)
    await handle_backups(results, publication.id, channel_service, create_notification_callback)
    await create_notifications(results, publication.id, create_notification_callback)

    success_count = sum(1 for r in results if r.success)
    total_count = len(results)

    await update_publication_status(
        publication,
        success_count,
        total_count,
        calculate_next_repeat_time_callback
    )

    db.add(publication)  # Явно добавляем чтобы SQLAlchemy отследил изменения
    await db.commit()
    await db.refresh(publication)

    publish_end = time.monotonic()
    logger.info(
        f"publish_now DONE publication_id={publication.id}, "
        f"total={publish_end-publish_start:.3f}s, success={success_count}/{total_count}"
    )

    return PublishResult(
        success=success_count > 0,
        results=results,
        success_count=success_count,
        total_count=total_count,
        publication_id=publication.id
    )


async def process_batch(
    publication: Publication,
    batch_channels: List[Channel],
    batch_num: int,
    get_bot_callback
) -> List[ChannelPublishResult]:
    """Обработать батч каналов"""
    
    logger.info(f"Processing batch {batch_num}: {len(batch_channels)} channels")
    
    tasks = [
        safe_send_to_channel(publication, channel, get_bot_callback)
        for channel in batch_channels
    ]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    results = []
    for i, result in enumerate(raw_results):
        if isinstance(result, BaseException):
            channel = batch_channels[i]
            channel_name = getattr(channel, "title", str(channel.telegram_id))
            logger.error(f"Exception for channel {channel_name}: {result}")
            results.append(ChannelPublishResult(
                channel=channel_name,
                success=False,
                error=str(result)
            ))
        else:
            results.append(result)
    
    return results


async def safe_send_to_channel(
    publication: Publication,
    channel: Channel,
    get_bot_callback
) -> ChannelPublishResult:
    """Безопасная отправка в канал с обработкой ошибок"""
    
    channel_name = getattr(channel, "title", getattr(channel, "name", str(channel.telegram_id)))

    try:
        bot = await get_bot_callback(channel)
    except ValueError as e:
        return ChannelPublishResult(
            channel=channel_name,
            success=False,
            error=str(e),
            notification_error=f"Failed to publish to {channel_name}: {str(e)}"
        )

    return await send_to_channel_with_retry(publication, channel, bot, channel_name)


async def send_to_channel_with_retry(
    publication: Publication,
    channel: Channel,
    bot: RateLimitedBot,
    channel_name: str
) -> ChannelPublishResult:
    """Отправить в канал с повторными попытками"""
    
    # Получаем reply_to_message_id если нужно ответить на другой пост
    reply_to_message_id = None
    if publication.reply_to_post_id:
        from sqlalchemy import select
        from backend.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TelegramMessage.telegram_message_id)
                .where(
                    TelegramMessage.publication_id == publication.reply_to_post_id,
                    TelegramMessage.channel_id == channel.id
                )
                .limit(1)
            )
            telegram_msg = result.scalar_one_or_none()
            if telegram_msg:
                reply_to_message_id = telegram_msg
    
    for attempt in range(MAX_RETRY_ATTEMPTS):
        try:
            sent_messages = await send_to_telegram(
                publication,
                channel,
                bot,
                reply_to_message_id=reply_to_message_id
            )
            
            message_ids = [msg.message_id for msg in sent_messages]
            telegram_messages_data = [
                {
                    "publication_id": publication.id,
                    "channel_id": channel.id,
                    "telegram_message_id": msg_id
                }
                for msg_id in message_ids
            ]

            if publication.pin_message and message_ids:
                try:
                    await bot.pin_chat_message(
                        chat_id=channel.telegram_id,
                        message_id=message_ids[0],
                        disable_notification=publication.disable_notification
                    )
                except Exception as e:
                    logger.warning(f"Failed to pin message in {channel_name}: {e}")

            return ChannelPublishResult(
                channel=channel_name,
                success=True,
                message_ids=message_ids,
                telegram_messages_data=telegram_messages_data,
                sent_messages=sent_messages,
                channel_obj=channel
            )

        except TelegramRetryAfter as e:
            logger.warning(
                f"TelegramRetryAfter in {channel_name}: retry_after={e.retry_after}s, "
                f"attempt={attempt+1}/{MAX_RETRY_ATTEMPTS}, message: {str(e)}"
            )
            if attempt < MAX_RETRY_ATTEMPTS - 1:
                if e.retry_after > LARGE_RETRY_AFTER_THRESHOLD:
                    logger.warning(
                        f"Large retry_after={e.retry_after}s for {channel_name}. "
                        f"Consider task queue for delayed retry."
                    )
                    return ChannelPublishResult(
                        channel=channel_name,
                        success=False,
                        error=f"Rate limit too high: {e.retry_after}s. Try again later.",
                        notification_error=f"Failed to publish to {channel_name}: Rate limit"
                    )
                await asyncio.sleep(e.retry_after)
            else:
                return ChannelPublishResult(
                    channel=channel_name,
                    success=False,
                    error=f"Rate limit: {e.retry_after}s",
                    notification_error=f"Failed to publish to {channel_name}: Rate limit"
                )

        except Exception as e:
            logger.error(
                f"Error publishing to {channel_name}, attempt={attempt+1}/{MAX_RETRY_ATTEMPTS}: "
                f"{type(e).__name__}: {str(e)}", 
                exc_info=True
            )
            if attempt == MAX_RETRY_ATTEMPTS - 1:
                return ChannelPublishResult(
                    channel=channel_name,
                    success=False,
                    error=str(e),
                    notification_error=f"Failed to publish to {channel_name}"
                )
            await asyncio.sleep(2 ** attempt)

    return ChannelPublishResult(
        channel=channel_name,
        success=False,
        error="Unknown error",
        notification_error=f"Failed to publish to {channel_name}: Unknown error"
    )


async def save_telegram_messages(results: List[ChannelPublishResult], db: AsyncSession) -> None:
    """Сохранить telegram_messages в БД"""
    
    for result in results:
        if result.success and result.telegram_messages_data:
            for msg_data in result.telegram_messages_data:
                telegram_message = TelegramMessage(
                    publication_id=msg_data["publication_id"],
                    channel_id=msg_data["channel_id"],
                    telegram_message_id=msg_data["telegram_message_id"]
                )
                db.add(telegram_message)


async def handle_backups(
    results: List[ChannelPublishResult],
    publication_id: int,
    channel_service: ChannelService,
    create_notification_callback
) -> None:
    """Обработать бэкапы для успешных отправок"""
    
    for result in results:
        if result.success and hasattr(result, 'sent_messages') and hasattr(result, 'channel_obj'):
            try:
                await handle_instant_backup(
                    result.channel_obj,
                    result.sent_messages,
                    publication_id,
                    channel_service,
                    create_notification_callback
                )
            except Exception as e:
                logger.error(f"Failed to handle instant backup for {result.channel}: {e}")


async def handle_instant_backup(
    channel: Channel,
    messages: List[Any],
    publication_id: int,
    channel_service: ChannelService,
    create_notification_callback
) -> None:
    """Обработать мгновенный бэкап и ретрансляцию"""
    
    if channel.backup_mode == BackupMode.DISABLED:
        return

    try:
        for message in messages:
            backed_up_post = await channel_service.save_post_backup(channel.id, message)

            if (
                channel.backup_mode == BackupMode.INSTANT
                and channel.backup_target_id
                and channel.backup_target_id != channel.id
            ):
                await channel_service.retransmit_post(backed_up_post, channel.backup_target_id)
                
    except Exception as error:
        await create_notification_callback(
            publication_id,
            "error",
            f"Instant backup failed for {getattr(channel, 'title', channel.telegram_id)}",
            {"error": str(error)}
        )


async def create_notifications(
    results: List[ChannelPublishResult],
    publication_id: int,
    create_notification_callback
) -> None:
    """Создать уведомления о результатах публикации"""
    
    for result in results:
        if result.success:
            await create_notification_callback(
                publication_id,
                "success",
                f"Published to {result.channel}"
            )
        elif hasattr(result, 'notification_error') and result.notification_error:
            await create_notification_callback(
                publication_id,
                "error",
                result.notification_error
            )


async def update_publication_status(
    publication: Publication,
    success_count: int,
    total_count: int,
    calculate_next_repeat_time_callback
) -> None:
    """Обновить статус публикации после отправки"""
    
    if success_count == 0:
        publication.status = DBPublicationStatus.FAILED
        
    elif success_count == total_count:
        publication.status = DBPublicationStatus.PUBLISHED
        publication.published_time = datetime.now(timezone.utc)
        
        if publication.repeat_interval and publication.repeat_interval != DBRepeatInterval.NEVER:
            # Используем scheduled_time как базу для первого расчёта,
            # чтобы повторы были в точное время (без дрейфа)
            base_time = publication.scheduled_time or publication.published_time
            publication.next_repeat_time = calculate_next_repeat_time_callback(
                base_time,
                publication.repeat_interval,
                publication.repeat_custom_days,
                publication.repeat_custom_hours,
                publication.repeat_end_time,
                publication.repeat_custom_unit,
                publication.repeat_custom_value,
                publication.repeat_weekdays,
                publication.repeat_month_days,
                publication.repeat_year_month,
                publication.repeat_year_days
            )
            
    else:
        publication.status = DBPublicationStatus.PARTIAL_SUCCESS
        publication.published_time = datetime.now(timezone.utc)
        
        if publication.repeat_interval and publication.repeat_interval != DBRepeatInterval.NEVER:
            # Используем scheduled_time как базу для первого расчёта
            base_time = publication.scheduled_time or publication.published_time
            publication.next_repeat_time = calculate_next_repeat_time_callback(
                base_time,
                publication.repeat_interval,
                publication.repeat_custom_days,
                publication.repeat_custom_hours,
                publication.repeat_end_time,
                publication.repeat_custom_unit,
                publication.repeat_custom_value,
                publication.repeat_weekdays,
                publication.repeat_month_days,
                publication.repeat_year_month,
                publication.repeat_year_days
            )


async def republish(
    publication: Publication,
    db: AsyncSession,
    get_bot_callback,
    calculate_next_repeat_time_callback
) -> PublishResult:
    """Повторно опубликовать пост для повторяющихся публикаций"""
    
    if publication.repeat_interval == DBRepeatInterval.NEVER:
        return PublishResult(
            success=False,
            error="Publication is not set to repeat",
            results=[],
            success_count=0,
            total_count=0
        )

    results: List[ChannelPublishResult] = []

    for channel in publication.channels:
        channel_name = getattr(channel, "title", getattr(channel, "name", str(channel.telegram_id)))

        try:
            bot = await get_bot_callback(channel)
        except ValueError as e:
            results.append(ChannelPublishResult(
                channel=channel_name,
                success=False,
                error=str(e)
            ))
            continue

        result = await send_to_channel_with_retry(publication, channel, bot, channel_name)

        if result.success:
            for msg_id in result.message_ids:
                telegram_message = TelegramMessage(
                    publication_id=publication.id,
                    channel_id=channel.id,
                    telegram_message_id=msg_id
                )
                db.add(telegram_message)

        results.append(result)

    success_count = sum(1 for r in results if r.success)

    if success_count > 0:
        publication.published_time = datetime.now(timezone.utc)
        # При republish считаем от предыдущего next_repeat_time, чтобы избежать дрейфа времени
        # Например: если повтор каждый час в 12:00, 13:00, 14:00 — время не должно сдвигаться
        base_time = publication.next_repeat_time or publication.published_time
        publication.next_repeat_time = calculate_next_repeat_time_callback(
            base_time,
            publication.repeat_interval,
            publication.repeat_custom_days,
            publication.repeat_custom_hours,
            publication.repeat_end_time,
            publication.repeat_custom_unit,
            publication.repeat_custom_value,
            publication.repeat_weekdays,
            publication.repeat_month_days,
            publication.repeat_year_month,
            publication.repeat_year_days
        )

    await db.commit()

    return PublishResult(
        success=success_count > 0,
        results=results,
        success_count=success_count,
        total_count=len(results),
        publication_id=publication.id
    )
