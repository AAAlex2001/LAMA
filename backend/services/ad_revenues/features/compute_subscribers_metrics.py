"""Считает приток, отток и удержание подписчиков вокруг рекламной публикации.

Берёт три замера из таблицы: последний ДО публикации (точка отсчёта),
один около +24 часов и один около +48 часов (с допуском ±2 часа).
Разница даёт приток (если выросло) или отток (если упало).
Удержание — какая доля от 24-часового прироста осталась к 48 часам.
"""

from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelSubscribersSnapshot


WINDOW_TOLERANCE = timedelta(hours=2)
SEARCH_PADDING = timedelta(hours=3)
WINDOW_24H = timedelta(hours=24)
WINDOW_48H = timedelta(hours=48)


@dataclass(frozen=True)
class SubscribersAnchor:
    """Один канал плюс время рекламной публикации — точка отсчёта для расчёта."""

    channel_id: int
    anchor_at: datetime


@dataclass(frozen=True)
class SubscribersMetrics:
    """Сколько людей пришло и ушло за 24 и 48 часов, и процент удержания."""

    in_24h: Optional[int] = None
    in_48h: Optional[int] = None
    out_24h: Optional[int] = None
    out_48h: Optional[int] = None
    retention_rate: Optional[float] = None


@dataclass(frozen=True)
class SubscribersSnapshotPoint:
    """Одна строка замера: когда сняли и сколько было подписчиков."""

    taken_at: datetime
    subscribers_count: int


@dataclass(frozen=True)
class ChannelSnapshotSeries:
    """Все замеры одного канала за нужный период — чтобы искать в них точки."""

    channel_id: int
    points: List[SubscribersSnapshotPoint] = field(default_factory=list)

    def baseline_for(self, anchor_at: datetime) -> Optional[int]:
        """Последнее значение подписчиков, снятое НЕ позже anchor_at."""
        latest: Optional[SubscribersSnapshotPoint] = None
        for point in self.points:
            if point.taken_at > anchor_at:
                continue
            if latest is None or point.taken_at > latest.taken_at:
                latest = point
        return latest.subscribers_count if latest else None

    def nearest_to(self, target: datetime, tolerance: timedelta) -> Optional[int]:
        """Snapshot, ближайший к `target` в пределах `tolerance`."""
        best_diff: Optional[timedelta] = None
        best_value: Optional[int] = None
        for point in self.points:
            diff = abs(point.taken_at - target)
            if diff > tolerance:
                continue
            if best_diff is None or diff < best_diff:
                best_diff = diff
                best_value = point.subscribers_count
        return best_value


class ComputeSubscribersMetrics:
    """Считает метрики подписчиков сразу для пачки рекламных публикаций.

    На каждый канал делается один запрос в БД, дальше расчёт идёт уже в памяти.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, anchors: Iterable[SubscribersAnchor]
    ) -> dict[SubscribersAnchor, SubscribersMetrics]:
        unique_anchors = unique_normalized(anchors)
        if not unique_anchors:
            return {}

        series_by_channel = await self.fetch_series(unique_anchors)
        return {
            anchor: compute_for_anchor(series_by_channel.get(anchor.channel_id), anchor)
            for anchor in unique_anchors
        }

    async def fetch_series(
        self, anchors: List[SubscribersAnchor]
    ) -> dict[int, ChannelSnapshotSeries]:
        bounds_by_channel = bounds_per_channel(anchors)
        result: dict[int, ChannelSnapshotSeries] = {}
        for channel_id, (lo, hi) in bounds_by_channel.items():
            stmt = (
                select(
                    ChannelSubscribersSnapshot.taken_at,
                    ChannelSubscribersSnapshot.subscribers_count,
                )
                .where(
                    ChannelSubscribersSnapshot.channel_id == channel_id,
                    ChannelSubscribersSnapshot.taken_at >= lo,
                    ChannelSubscribersSnapshot.taken_at <= hi,
                )
                .order_by(ChannelSubscribersSnapshot.taken_at.asc())
            )
            rows = (await self.db.execute(stmt)).all()
            points = [
                SubscribersSnapshotPoint(
                    taken_at=normalize_dt(row.taken_at),
                    subscribers_count=int(row.subscribers_count),
                )
                for row in rows
            ]
            result[channel_id] = ChannelSnapshotSeries(channel_id=channel_id, points=points)
        return result


def compute_for_anchor(
    series: Optional[ChannelSnapshotSeries], anchor: SubscribersAnchor
) -> SubscribersMetrics:
    if series is None or not series.points:
        return SubscribersMetrics()

    baseline = series.baseline_for(anchor.anchor_at)
    if baseline is None:
        return SubscribersMetrics()

    after_24h = series.nearest_to(anchor.anchor_at + WINDOW_24H, WINDOW_TOLERANCE)
    after_48h = series.nearest_to(anchor.anchor_at + WINDOW_48H, WINDOW_TOLERANCE)

    delta_24h = (after_24h - baseline) if after_24h is not None else None
    delta_48h = (after_48h - baseline) if after_48h is not None else None

    in_24h, out_24h = split_delta(delta_24h)
    in_48h, out_48h = split_delta(delta_48h)
    retention = compute_retention(delta_24h, delta_48h)

    return SubscribersMetrics(
        in_24h=in_24h,
        in_48h=in_48h,
        out_24h=out_24h,
        out_48h=out_48h,
        retention_rate=retention,
    )


def split_delta(delta: Optional[int]) -> tuple[Optional[int], Optional[int]]:
    if delta is None:
        return None, None
    if delta >= 0:
        return delta, 0
    return 0, -delta


def compute_retention(
    delta_24h: Optional[int], delta_48h: Optional[int]
) -> Optional[float]:
    """Какая доля прироста (за 24ч) удержалась к 48ч. None если данных нет или нет прироста."""
    if delta_24h is None or delta_48h is None or delta_24h <= 0:
        return None
    rate = (delta_48h / delta_24h) * 100.0
    return max(0.0, min(rate, 100.0))


def unique_normalized(anchors: Iterable[SubscribersAnchor]) -> List[SubscribersAnchor]:
    seen: set[SubscribersAnchor] = set()
    result: List[SubscribersAnchor] = []
    for anchor in anchors:
        if not anchor.channel_id or anchor.anchor_at is None:
            continue
        normalized = replace(anchor, anchor_at=normalize_dt(anchor.anchor_at))
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def bounds_per_channel(
    anchors: List[SubscribersAnchor],
) -> dict[int, tuple[datetime, datetime]]:
    """Минимальный диапазон поиска snapshot'ов на канал, чтобы дотянуться до +48ч ± padding."""
    by_channel: dict[int, list[datetime]] = {}
    for anchor in anchors:
        by_channel.setdefault(anchor.channel_id, []).append(anchor.anchor_at)
    return {
        channel_id: (min(times) - SEARCH_PADDING, max(times) + WINDOW_48H + SEARCH_PADDING)
        for channel_id, times in by_channel.items()
    }


def normalize_dt(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
