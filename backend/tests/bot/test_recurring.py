"""Тесты повторяющихся сообщений: CRUD + schedule_calculator."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.bots import RecurringMessage, RecurringMessageInterval
from backend.schemas.bots.recurring import RecurringMessageCreate, RecurringMessageUpdate
from backend.services.bot.features.recurring.create_recurring import CreateRecurring
from backend.services.bot.features.recurring.delete_recurring import DeleteRecurring
from backend.services.bot.features.recurring.list_recurring import ListRecurring
from backend.services.bot.features.recurring.schedule_calculator import (
    calculate_next_send,
    next_weekly_date,
    pick_today_candidate,
)
from backend.services.bot.features.recurring.update_recurring import UpdateRecurring


def make_msg(**overrides):
    msg = RecurringMessage(
        bot_id=1, name="r",
        target_chats=[100],
        interval_type=overrides.pop("interval_type", RecurringMessageInterval.DAILY),
        time_points=overrides.pop("time_points", ["09:00"]),
        timezone=overrides.pop("timezone", "UTC"),
        weekdays=overrides.pop("weekdays", None),
        interval_value=overrides.pop("interval_value", None),
    )
    for k, v in overrides.items():
        setattr(msg, k, v)
    return msg


@pytest.mark.asyncio
async def test_create_recurring(db, test_user, test_bot):
    payload = RecurringMessageCreate(
        name="Утренняя рассылка",
        text_content="Доброе утро",
        target_chats=[111, 222],
        interval_type=RecurringMessageInterval.DAILY,
        time_points=["09:00"],
        timezone="UTC",
    )
    msg = await CreateRecurring(db).execute(test_bot.id, payload, test_user.id)
    await db.commit()
    assert msg.id is not None
    assert msg.target_chats == [111, 222]
    assert msg.next_send_at is not None


@pytest.mark.asyncio
async def test_create_404_for_foreign_bot(db, test_user):
    payload = RecurringMessageCreate(
        name="x", target_chats=[1],
        interval_type=RecurringMessageInterval.DAILY,
        time_points=["09:00"], timezone="UTC",
    )
    with pytest.raises(HTTPException) as exc:
        await CreateRecurring(db).execute(99999, payload, test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_recurring(db, test_user, test_bot):
    payload = RecurringMessageCreate(
        name="Old", target_chats=[1],
        interval_type=RecurringMessageInterval.DAILY,
        time_points=["09:00"], timezone="UTC",
    )
    msg = await CreateRecurring(db).execute(test_bot.id, payload, test_user.id)
    await db.commit()

    updated = await UpdateRecurring(db).execute(
        msg.id, RecurringMessageUpdate(name="New"), test_user.id, bot_id=test_bot.id,
    )
    await db.commit()
    assert updated.name == "New"


@pytest.mark.asyncio
async def test_list_recurring(db, test_user, test_bot):
    for n in ["a", "b", "c"]:
        payload = RecurringMessageCreate(
            name=n, target_chats=[1],
            interval_type=RecurringMessageInterval.DAILY,
            time_points=["09:00"], timezone="UTC",
        )
        await CreateRecurring(db).execute(test_bot.id, payload, test_user.id)
    await db.commit()

    items, total = await ListRecurring(db).execute(test_bot.id, test_user.id, 0, 10)
    assert total == 3


@pytest.mark.asyncio
async def test_delete_recurring(db, test_user, test_bot):
    payload = RecurringMessageCreate(
        name="bye", target_chats=[1],
        interval_type=RecurringMessageInterval.DAILY,
        time_points=["09:00"], timezone="UTC",
    )
    msg = await CreateRecurring(db).execute(test_bot.id, payload, test_user.id)
    await db.commit()
    mid = msg.id

    await DeleteRecurring(db).execute(mid, test_user.id, bot_id=test_bot.id)
    await db.commit()
    remaining = (await db.execute(
        select(RecurringMessage).where(RecurringMessage.id == mid)
    )).scalar_one_or_none()
    assert remaining is None


def test_pick_today_candidate_picks_future_time():
    now = datetime(2026, 5, 15, 8, 0, tzinfo=timezone.utc)
    chosen = pick_today_candidate(now, ["09:00", "18:00"], None)
    assert chosen is not None
    assert chosen.hour == 9


def test_pick_today_candidate_skips_past_times():
    now = datetime(2026, 5, 15, 10, 0, tzinfo=timezone.utc)
    chosen = pick_today_candidate(now, ["08:00", "18:00"], None)
    assert chosen is not None
    assert chosen.hour == 18


def test_pick_today_candidate_returns_none_when_all_past():
    now = datetime(2026, 5, 15, 23, 0, tzinfo=timezone.utc)
    chosen = pick_today_candidate(now, ["08:00", "18:00"], None)
    assert chosen is None


def test_pick_today_candidate_respects_weekdays():
    # 2026-05-15 — пятница (weekday=4). Если weekdays=[0,1,2] — никакое время не подходит.
    now = datetime(2026, 5, 15, 7, 0, tzinfo=timezone.utc)
    chosen = pick_today_candidate(now, ["09:00"], [0, 1, 2])
    assert chosen is None


def test_next_weekly_date_finds_next_in_list():
    current = datetime(2026, 5, 15, 10, 0, tzinfo=timezone.utc)  # Friday=4
    next_date = next_weekly_date(current, [0, 1, 6])  # Mon, Tue, Sun
    # из текущей пятницы → ближайший упомянутый weekday = воскресенье (=6)
    assert next_date.weekday() == 6


def test_next_weekly_date_wraps_week():
    current = datetime(2026, 5, 15, 10, 0, tzinfo=timezone.utc)  # Friday=4
    next_date = next_weekly_date(current, [0, 1])  # Mon, Tue только
    # из пятницы должен прыгнуть на понедельник следующей недели
    assert next_date.weekday() == 0


def test_calculate_next_send_daily():
    msg = make_msg(
        interval_type=RecurringMessageInterval.DAILY,
        time_points=["09:00"], timezone="UTC",
    )
    result = calculate_next_send(msg)
    assert result.tzinfo is not None
    assert result.hour == 9
