"""Тесты для серий публикаций."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationSeries,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.series import PublicationSeriesUpdate
from backend.services.publications.features.series.create_series import CreateSeries
from backend.services.publications.features.series.delete_series import DeleteSeries
from backend.services.publications.features.series.get_series_publications import (
    GetSeriesPublications,
)
from backend.services.publications.features.series.lookup import find_series_or_404
from backend.services.publications.features.series.update_series import UpdateSeries


async def make_series(db, **overrides):
    s = PublicationSeries(
        name=overrides.pop("name", "My series"),
        description=overrides.pop("description", None),
        reply_to_previous=overrides.pop("reply_to_previous", True),
        **overrides,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


@pytest.mark.asyncio
async def test_create_returns_series(db):
    s = await CreateSeries(db).execute(name="N", description="D", reply_to_previous=False)
    await db.commit()

    assert s.id is not None
    assert s.name == "N"
    assert s.description == "D"
    assert s.reply_to_previous is False


@pytest.mark.asyncio
async def test_update_partial(db):
    s = await make_series(db, name="Old")
    updated = await UpdateSeries(db).execute(
        s.id, PublicationSeriesUpdate(name="New"),
    )
    await db.commit()

    assert updated.name == "New"
    assert updated.reply_to_previous is True  # не менялось


@pytest.mark.asyncio
async def test_find_or_404_unknown(db):
    with pytest.raises(HTTPException) as exc:
        await find_series_or_404(db, 9999)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_series_publications_orders_by_series_order(db, test_user):
    s = await make_series(db)
    for order in [2, 0, 1]:
        db.add(Publication(
            owner_id=test_user.id,
            content_type=DBContentType.TEXT,
            status=DBPublicationStatus.DRAFT,
            text_content=f"p{order}",
            series_id=s.id,
            series_order=order,
        ))
    await db.commit()

    items = await GetSeriesPublications(db).execute(s.id)
    assert [p.series_order for p in items] == [0, 1, 2]


@pytest.mark.asyncio
async def test_delete_removes_drafts_and_marks_published_deleted(db, test_user, monkeypatch):
    fake_task = MagicMock()
    fake_task.apply_async = MagicMock()
    import sys
    monkeypatch.setitem(
        sys.modules,
        "backend.celery.tasks",
        SimpleNamespace(delete_publication_messages=fake_task),
    )

    s = await make_series(db)
    draft = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="draft",
        series_id=s.id,
        series_order=0,
    )
    published = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.PUBLISHED,
        text_content="published",
        series_id=s.id,
        series_order=1,
    )
    db.add_all([draft, published])
    await db.commit()
    await db.refresh(draft)
    await db.refresh(published)
    draft_id = draft.id
    published_id = published.id

    deleted_count = await DeleteSeries(db).execute(s.id)
    await db.commit()

    assert deleted_count == 2

    draft_row = (await db.execute(
        select(Publication).where(Publication.id == draft_id)
    )).scalar_one_or_none()
    assert draft_row is None

    db.expire_all()
    published_row = (await db.execute(
        select(Publication).where(Publication.id == published_id)
    )).scalar_one()
    assert published_row.status == DBPublicationStatus.DELETED

    fake_task.apply_async.assert_called_once()
