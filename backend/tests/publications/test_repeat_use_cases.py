"""Тесты для cancel_repeat / stop_repeat_from / add_repeat_exclusion / reschedule_publication."""

from datetime import datetime, timezone

import pytest

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)
from backend.services.publications.features.publications.add_repeat_exclusion import AddRepeatExclusion
from backend.services.publications.features.publications.cancel_repeat import CancelRepeat
from backend.services.publications.features.publications.reschedule_publication import (
    ReschedulePublication,
)
from backend.services.publications.features.publications.stop_repeat_from import StopRepeatFrom


async def make_repeating_pub(db, owner_id, **overrides):
    defaults = dict(
        owner_id=owner_id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        text_content="recurring",
        repeat_interval=DBRepeatInterval.WEEKLY,
        repeat_weekdays=[1, 3, 5],
        scheduled_time=datetime(2026, 5, 15, 12, tzinfo=timezone.utc),
    )
    defaults.update(overrides)
    pub = Publication(**defaults)
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_cancel_repeat_resets_all_repeat_fields(db, test_user):
    pub = await make_repeating_pub(db, test_user.id)

    await CancelRepeat(db).execute(pub)
    await db.commit()
    await db.refresh(pub)

    assert pub.repeat_interval == DBRepeatInterval.NEVER
    assert pub.repeat_weekdays is None
    assert pub.repeat_end_time is None
    assert pub.next_repeat_time is None


@pytest.mark.asyncio
async def test_stop_repeat_from_sets_end_time(db, test_user):
    pub = await make_repeating_pub(db, test_user.id)
    cut = datetime(2026, 6, 1, tzinfo=timezone.utc)

    await StopRepeatFrom(db).execute(pub, cut)
    await db.commit()
    await db.refresh(pub)

    end = pub.repeat_end_time
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    assert end == cut
    assert pub.next_repeat_time is None
    assert pub.repeat_interval == DBRepeatInterval.WEEKLY


@pytest.mark.asyncio
async def test_add_repeat_exclusion_appends_unique(db, test_user):
    pub = await make_repeating_pub(db, test_user.id)

    await AddRepeatExclusion(db).execute(pub, "2026-05-20")
    await AddRepeatExclusion(db).execute(pub, "2026-05-20")  # повтор
    await AddRepeatExclusion(db).execute(pub, "2026-05-27")
    await db.commit()
    await db.refresh(pub)

    assert pub.repeat_excluded_dates == ["2026-05-20", "2026-05-27"]


@pytest.mark.asyncio
async def test_reschedule_sets_time_and_status(db, test_user):
    pub = await make_repeating_pub(db, test_user.id, status=DBPublicationStatus.DRAFT)
    new_time = datetime(2026, 5, 20, 18, tzinfo=timezone.utc)

    updated = await ReschedulePublication(db).execute(pub, new_time)
    await db.commit()

    scheduled = updated.scheduled_time
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)
    assert scheduled == new_time
    assert updated.status == DBPublicationStatus.SCHEDULED
