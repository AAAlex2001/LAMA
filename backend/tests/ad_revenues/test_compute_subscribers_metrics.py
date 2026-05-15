"""Тесты для чистой части ПДП-расчётов — без БД."""

from datetime import datetime, timedelta, timezone

import pytest

from backend.services.ad_revenues.features.compute_subscribers_metrics import (
    ChannelSnapshotSeries,
    SubscribersAnchor,
    SubscribersSnapshotPoint,
    compute_for_anchor,
    compute_retention,
    split_delta,
)


def make_series(channel_id: int, points: list[tuple[datetime, int]]) -> ChannelSnapshotSeries:
    return ChannelSnapshotSeries(
        channel_id=channel_id,
        points=[SubscribersSnapshotPoint(taken_at=t, subscribers_count=c) for t, c in points],
    )


def test_split_delta_positive():
    assert split_delta(7) == (7, 0)


def test_split_delta_negative():
    assert split_delta(-3) == (0, 3)


def test_split_delta_none():
    assert split_delta(None) == (None, None)


def test_compute_retention_half():
    assert compute_retention(10, 5) == pytest.approx(50.0)


def test_compute_retention_full():
    assert compute_retention(10, 10) == pytest.approx(100.0)


def test_compute_retention_capped_at_100():
    assert compute_retention(10, 15) == pytest.approx(100.0)


def test_compute_retention_floored_at_0():
    assert compute_retention(10, -5) == pytest.approx(0.0)


def test_compute_retention_none_when_no_24h_growth():
    assert compute_retention(0, 5) is None
    assert compute_retention(None, 5) is None
    assert compute_retention(10, None) is None


def test_compute_for_anchor_returns_empty_when_no_baseline():
    anchor_at = datetime(2026, 5, 15, 12, tzinfo=timezone.utc)
    series = make_series(1, [(anchor_at + timedelta(hours=24), 100)])  # only post-baseline

    metrics = compute_for_anchor(series, SubscribersAnchor(channel_id=1, anchor_at=anchor_at))

    assert metrics.in_24h is None
    assert metrics.in_48h is None
    assert metrics.out_24h is None
    assert metrics.retention_rate is None


def test_compute_for_anchor_growth_only():
    anchor_at = datetime(2026, 5, 15, 12, tzinfo=timezone.utc)
    series = make_series(1, [
        (anchor_at - timedelta(hours=1), 1000),       # baseline
        (anchor_at + timedelta(hours=24), 1050),      # +50 за сутки
        (anchor_at + timedelta(hours=48), 1080),      # +80 за двое суток
    ])

    metrics = compute_for_anchor(series, SubscribersAnchor(channel_id=1, anchor_at=anchor_at))

    assert metrics.in_24h == 50
    assert metrics.out_24h == 0
    assert metrics.in_48h == 80
    assert metrics.out_48h == 0
    assert metrics.retention_rate == pytest.approx(100.0)  # delta_48h >= delta_24h


def test_compute_for_anchor_with_partial_retention():
    anchor_at = datetime(2026, 5, 15, 12, tzinfo=timezone.utc)
    series = make_series(1, [
        (anchor_at - timedelta(hours=1), 1000),
        (anchor_at + timedelta(hours=24), 1100),  # +100
        (anchor_at + timedelta(hours=48), 1040),  # +40 (60 отписались)
    ])

    metrics = compute_for_anchor(series, SubscribersAnchor(channel_id=1, anchor_at=anchor_at))

    assert metrics.in_24h == 100
    assert metrics.in_48h == 40
    assert metrics.retention_rate == pytest.approx(40.0)  # 40 / 100 = 40%


def test_compute_for_anchor_loss():
    anchor_at = datetime(2026, 5, 15, 12, tzinfo=timezone.utc)
    series = make_series(1, [
        (anchor_at - timedelta(hours=1), 1000),
        (anchor_at + timedelta(hours=24), 980),  # -20
    ])

    metrics = compute_for_anchor(series, SubscribersAnchor(channel_id=1, anchor_at=anchor_at))

    assert metrics.in_24h == 0
    assert metrics.out_24h == 20


def test_compute_for_anchor_window_too_far():
    anchor_at = datetime(2026, 5, 15, 12, tzinfo=timezone.utc)
    series = make_series(1, [
        (anchor_at - timedelta(hours=1), 1000),
        # snapshot за пределами 2-часового окна
        (anchor_at + timedelta(hours=30), 1050),
    ])

    metrics = compute_for_anchor(series, SubscribersAnchor(channel_id=1, anchor_at=anchor_at))

    assert metrics.in_24h is None
