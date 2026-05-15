"""Тесты для ScheduleAdRevenueSnapshots — celery-задачи замокированы."""

from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.models.ad_revenues import AdRevenue
from backend.services.ad_revenues.features.schedule_ad_revenue_snapshots import (
    DELAY_24H,
    DELAY_48H,
    ScheduleAdRevenueSnapshots,
)


def make_ad_revenue(channel_id):
    return AdRevenue(
        id=1,
        owner_id=1,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        channel_id=channel_id,
    )


@pytest.fixture
def patch_celery(monkeypatch):
    """Подменяем модуль celery.tasks на заглушку с apply_async-мокком."""
    fake_task = MagicMock()
    fake_task.apply_async = MagicMock()
    fake_module = SimpleNamespace(take_channel_subscribers_snapshot=fake_task)

    import sys
    monkeypatch.setitem(sys.modules, "backend.celery.tasks", fake_module)
    return fake_task


@pytest.mark.no_snapshot_patch
@pytest.mark.asyncio
async def test_skips_when_no_channel(db, patch_celery, monkeypatch):
    from backend.services.ad_revenues.features import schedule_ad_revenue_snapshots as mod
    monkeypatch.setattr(
        mod.TakeChannelSnapshot, "execute", AsyncMock(return_value=None)
    )

    result = await ScheduleAdRevenueSnapshots(db).execute(make_ad_revenue(channel_id=None))

    assert result.baseline is None
    assert result.deferred_count == 0
    patch_celery.apply_async.assert_not_called()


@pytest.mark.no_snapshot_patch
@pytest.mark.asyncio
async def test_takes_baseline_and_queues_two_deferred(db, patch_celery, monkeypatch):
    from backend.services.ad_revenues.features import schedule_ad_revenue_snapshots as mod
    fake_baseline = SimpleNamespace(channel_id=42)
    monkeypatch.setattr(
        mod.TakeChannelSnapshot, "execute", AsyncMock(return_value=fake_baseline)
    )

    result = await ScheduleAdRevenueSnapshots(db).execute(make_ad_revenue(channel_id=42))

    assert result.baseline is fake_baseline
    assert result.deferred_count == 2

    assert patch_celery.apply_async.call_count == 2
    countdowns = [
        call.kwargs["countdown"] for call in patch_celery.apply_async.call_args_list
    ]
    assert int(DELAY_24H.total_seconds()) in countdowns
    assert int(DELAY_48H.total_seconds()) in countdowns


def test_delay_constants_are_24h_and_48h():
    assert DELAY_24H == timedelta(hours=24)
    assert DELAY_48H == timedelta(hours=48)
