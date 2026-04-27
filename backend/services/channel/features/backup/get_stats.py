from sqlalchemy import String, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost, PostRetransmission
from backend.schemas.channels import ChannelStatsResponse


class GetBackupStats:
    """Считает статистику бэкапа канала: количество, размер, диапазон дат, ретрансляции."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int) -> ChannelStatsResponse:
        """Возвращает ``ChannelStatsResponse`` за один-два запроса."""
        size_expr = (
            func.coalesce(func.sum(func.length(cast(BackedUpPost.raw_data, String))), 0)
            + func.coalesce(func.sum(func.length(BackedUpPost.text_content)), 0)
        )

        row = (await self.db.execute(
            select(
                func.count(BackedUpPost.id),
                func.min(BackedUpPost.original_date),
                func.max(BackedUpPost.original_date),
                size_expr,
            ).where(BackedUpPost.channel_id == channel_id)
        )).one()
        total_posts, first_date, last_date, size_bytes = row

        total_retransmissions = (await self.db.execute(
            select(func.count(PostRetransmission.id))
            .join(BackedUpPost, PostRetransmission.original_post_id == BackedUpPost.id)
            .where(BackedUpPost.channel_id == channel_id)
        )).scalar() or 0

        return ChannelStatsResponse(
            channel_id=channel_id,
            total_backed_up_posts=total_posts,
            total_retransmissions=total_retransmissions,
            backup_size_mb=round((size_bytes or 0) / (1024 * 1024), 2),
            first_post_date=first_date,
            last_post_date=last_date,
        )
