"""На создание рекламы ставим три замера подписчиков канала:
сразу (точка отсчёта), через 24 часа и через 48 часов.
По этим трём точкам потом считается приток/отток и удержание.
Если канал не указан — ничего не ставим.
"""

import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ad_revenues import AdRevenue
from backend.services.ad_revenues.features.take_channel_snapshot import (
    SnapshotTaken,
    TakeChannelSnapshot,
)

logger = logging.getLogger(__name__)

DELAY_24H = timedelta(hours=24)
DELAY_48H = timedelta(hours=48)


@dataclass(frozen=True)
class ScheduledSnapshots:
    """Результат: сняли ли baseline и сколько отложенных задач поставили."""

    baseline: Optional[SnapshotTaken]
    deferred_count: int


class ScheduleAdRevenueSnapshots:
    """Снимает первый замер подписчиков сейчас и ставит ещё два в очередь — через 24 и 48 часов."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, ad_revenue: AdRevenue) -> ScheduledSnapshots:
        if not ad_revenue.channel_id:
            return ScheduledSnapshots(baseline=None, deferred_count=0)

        baseline = await TakeChannelSnapshot(self.db).execute(ad_revenue.channel_id)
        deferred_count = self.queue_deferred(ad_revenue.channel_id)
        return ScheduledSnapshots(baseline=baseline, deferred_count=deferred_count)

    def queue_deferred(self, channel_id: int) -> int:
        """Кладёт в очередь два замера — через 24 и 48 часов."""

        from backend.celery.tasks import take_channel_subscribers_snapshot

        delays: List[timedelta] = [DELAY_24H, DELAY_48H]
        for delay in delays:
            take_channel_subscribers_snapshot.apply_async(
                args=[channel_id],
                countdown=int(delay.total_seconds()),
                queue="low",
            )
        return len(delays)
