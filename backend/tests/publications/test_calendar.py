"""Тесты для календарных счётчиков и пресетов времени.

SQLite-шим в conftest подменяет postgres-only функции `timezone(tz, dt)` и
`to_char(dt, fmt)` на Python-аналоги. Для tests с tz='UTC' этого достаточно.
"""

from datetime import datetime, timezone

import pytest

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.publications.features.calendar.get_day_counts import GetDayCounts
from backend.services.publications.features.calendar.get_recent_times import GetRecentTimes


def utc(year, month, day, hour=12, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_day_counts_groups_by_date(db, test_user):
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        scheduled_time=utc(2026, 5, 15, 10),
        text_content="a",
    ))
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        scheduled_time=utc(2026, 5, 15, 18),
        text_content="b",
    ))
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        scheduled_time=utc(2026, 5, 16, 9),
        text_content="c",
    ))
    await db.commit()

    counts = await GetDayCounts(db).execute(
        utc(2026, 5, 1), utc(2026, 5, 31, 23, 59),
        owner_id=test_user.id, mode="scheduled", tz="UTC",
    )

    counts_map = {c.date: c.count for c in counts}
    assert counts_map.get("2026-05-15") == 2
    assert counts_map.get("2026-05-16") == 1


@pytest.mark.asyncio
async def test_day_counts_filters_by_owner(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    db.add(Publication(
        owner_id=other.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        scheduled_time=utc(2026, 5, 15),
        text_content="foreign",
    ))
    await db.commit()

    counts = await GetDayCounts(db).execute(
        utc(2026, 5, 1), utc(2026, 5, 31, 23, 59),
        owner_id=test_user.id, mode="scheduled", tz="UTC",
    )
    assert counts == []


@pytest.mark.asyncio
async def test_recent_times_returns_most_frequent(db, test_user):
    for hour, minute, n in [(9, 0, 3), (18, 30, 2), (12, 15, 1)]:
        for i in range(n):
            db.add(Publication(
                owner_id=test_user.id,
                content_type=DBContentType.TEXT,
                status=DBPublicationStatus.SCHEDULED,
                scheduled_time=utc(2026, 5, 10 + i, hour, minute),
                text_content=f"p{i}",
            ))
    await db.commit()

    times = await GetRecentTimes(db).execute(owner_id=test_user.id, tz="UTC", limit=3)

    assert times[0] == "09:00"
    assert times[1] == "18:30"
    assert times[2] == "12:15"


@pytest.mark.asyncio
async def test_recent_times_ignores_deleted(db, test_user):
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DELETED,
        scheduled_time=utc(2026, 5, 15, 7, 0),
        text_content="deleted",
    ))
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        scheduled_time=utc(2026, 5, 15, 8, 0),
        text_content="kept",
    ))
    await db.commit()

    times = await GetRecentTimes(db).execute(owner_id=test_user.id, tz="UTC", limit=5)
    assert "07:00" not in times
    assert "08:00" in times
