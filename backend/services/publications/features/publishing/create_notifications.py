"""PublicationNotification по результатам публикации."""

from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import PublicationNotification
from backend.schemas.publications import ChannelPublishResult


def make_notification_callback(db: AsyncSession):
    """Фабрика callback'а: каждый вызов добавляет PublicationNotification и flush'ит."""
    async def callback(publication_id: int, status: str, message: str, error_details=None):
        db.add(PublicationNotification(
            publication_id=publication_id,
            status=status,
            message=message,
            error_details=error_details,
        ))
        await db.flush()

    return callback


async def create_notifications(
    results: List[ChannelPublishResult],
    publication_id: int,
    create_notification_callback,
) -> None:
    """Уведомление 'success' для каждого успеха, 'error' для каждого fail с notification_error."""
    for result in results:
        if result.success:
            await create_notification_callback(
                publication_id, "success", f"Published to {result.channel}",
            )
        elif result.notification_error:
            await create_notification_callback(
                publication_id, "error", result.notification_error,
            )
