"""Вспомогательные функции после публикации: сохранение, бэкапы, уведомления, статус."""

from datetime import datetime, timezone
from typing import Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication, TelegramMessage,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.models.channels import ChannelGroup as Channel, BackupMode
from backend.schemas.publications import ChannelPublishResult
from backend.services.channel import ChannelService

logger = logging.getLogger(__name__)


async def save_telegram_messages(results: List[ChannelPublishResult], db: AsyncSession) -> None:
    """Сохранить telegram_messages в БД."""
    for result in results:
        if result.success and result.telegram_messages_data:
            for msg_data in result.telegram_messages_data:
                telegram_message = TelegramMessage(
                    publication_id=msg_data["publication_id"],
                    channel_id=msg_data["channel_id"],
                    telegram_message_id=msg_data["telegram_message_id"],
                )
                db.add(telegram_message)


async def handle_backups(
    results: List[ChannelPublishResult],
    publication_id: int,
    channel_service: ChannelService,
    create_notification_callback,
) -> None:
    """Обработать бэкапы для успешных отправок."""
    for result in results:
        if result.success and result.sent_messages and result.channel_obj:
            try:
                await handle_instant_backup(
                    result.channel_obj, result.sent_messages,
                    publication_id, channel_service, create_notification_callback,
                )
            except Exception as e:
                logger.error("Failed to handle instant backup for %s: %s", result.channel, e)


async def handle_instant_backup(
    channel: Channel,
    messages: List[Any],
    publication_id: int,
    channel_service: ChannelService,
    create_notification_callback,
) -> None:
    """Обработать мгновенный бэкап и ретрансляцию."""
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
            publication_id, "error",
            f"Instant backup failed for {getattr(channel, 'title', channel.telegram_id)}",
            {"error": str(error)},
        )


async def create_notifications(
    results: List[ChannelPublishResult],
    publication_id: int,
    create_notification_callback,
) -> None:
    """Создать уведомления о результатах публикации."""
    for result in results:
        if result.success:
            await create_notification_callback(publication_id, "success", f"Published to {result.channel}")
        elif result.notification_error:
            await create_notification_callback(publication_id, "error", result.notification_error)


def update_publication_status(
    publication: Publication,
    success_count: int,
    total_count: int,
    calculate_next_repeat_time_callback,
) -> None:
    """Обновить статус публикации после отправки."""
    if success_count == 0:
        publication.status = DBPublicationStatus.FAILED
        return

    publication.published_time = datetime.now(timezone.utc)
    publication.status = (
        DBPublicationStatus.PUBLISHED if success_count == total_count
        else DBPublicationStatus.PARTIAL_SUCCESS
    )

    if publication.repeat_interval and publication.repeat_interval != DBRepeatInterval.NEVER:
        base_time = publication.scheduled_time or publication.published_time
        publication.next_repeat_time = compute_next_repeat(publication, base_time, calculate_next_repeat_time_callback)


def compute_next_repeat(publication: Publication, base_time: datetime, calculate_fn) -> Optional[datetime]:
    """Рассчитать следующее время повтора."""
    return calculate_fn(
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
        publication.repeat_year_days,
    )
