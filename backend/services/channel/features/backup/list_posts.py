from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost


class ListBackedUpPosts:
    """Постранично возвращает забэкапленные посты канала с фильтром по дате."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        channel_id: int,
        page: int = 1,
        page_size: int = 50,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[BackedUpPost], int]:
        """Возвращает (страницу постов отсортированных по дате, общее количество)."""
        items_query = select(BackedUpPost).where(BackedUpPost.channel_id == channel_id)
        total_query = select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)

        if start_date:
            items_query = items_query.where(BackedUpPost.original_date >= start_date)
            total_query = total_query.where(BackedUpPost.original_date >= start_date)
        if end_date:
            items_query = items_query.where(BackedUpPost.original_date <= end_date)
            total_query = total_query.where(BackedUpPost.original_date <= end_date)

        items_query = (
            items_query
            .order_by(BackedUpPost.original_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        total = (await self.db.execute(total_query)).scalar() or 0
        items = (await self.db.execute(items_query)).scalars().all()
        return list(items), total
