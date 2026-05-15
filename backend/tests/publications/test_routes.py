"""Интеграционные тесты роутов /api/publications/* через httpx.AsyncClient + asgi-lifespan."""

import pytest
from sqlalchemy import select

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)


def text_payload(**overrides):
    base = {
        "content_type": "text",
        "text_content": "Hello",
        "status": "draft",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_create_returns_201(client):
    response = await client.post("/api/publications/", json=text_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["text_content"] == "Hello"
    assert body["status"] == "draft"


@pytest.mark.asyncio
async def test_get_returns_existing(client, db, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="abc",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)

    response = await client.get(f"/api/publications/{pub.id}")
    assert response.status_code == 200
    assert response.json()["text_content"] == "abc"


@pytest.mark.asyncio
async def test_get_returns_404(client):
    response = await client.get("/api/publications/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_partially_updates(client, db, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="old",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)

    response = await client.patch(
        f"/api/publications/{pub.id}",
        json={"text_content": "new"},
    )
    assert response.status_code == 200
    assert response.json()["text_content"] == "new"


@pytest.mark.asyncio
async def test_delete_removes(client, db, session_factory, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="bye",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    pub_id = pub.id

    response = await client.delete(f"/api/publications/{pub_id}")
    assert response.status_code == 204

    async with session_factory() as fresh:
        remaining = (await fresh.execute(
            select(Publication).where(Publication.id == pub_id)
        )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_delete_repeat_this_adds_exclusion(client, db, session_factory, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        text_content="rec",
        repeat_interval=DBRepeatInterval.WEEKLY,
        repeat_weekdays=[1],
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    pub_id = pub.id

    response = await client.delete(
        f"/api/publications/{pub_id}",
        params={"repeat_mode": "this", "repeat_date": "2026-05-20T12:00:00"},
    )
    assert response.status_code == 204

    async with session_factory() as fresh:
        kept = (await fresh.execute(
            select(Publication).where(Publication.id == pub_id)
        )).scalar_one()
        assert kept.repeat_excluded_dates == ["2026-05-20"]


@pytest.mark.asyncio
async def test_delete_from_channel_triggers_celery_task(
    client, db, test_user, patch_delete_messages_task,
):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.PUBLISHED,
        text_content="published",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)

    response = await client.delete(
        f"/api/publications/{pub.id}",
        params={"delete_from_channel": "true"},
    )
    assert response.status_code == 204
    patch_delete_messages_task.delay.assert_called_once_with(pub.id)


@pytest.mark.asyncio
async def test_list_filters_by_status(client, db, test_user):
    for status_, text in [
        (DBPublicationStatus.DRAFT, "d"),
        (DBPublicationStatus.SCHEDULED, "s"),
    ]:
        db.add(Publication(
            owner_id=test_user.id,
            content_type=DBContentType.TEXT,
            status=status_,
            text_content=text,
        ))
    await db.commit()

    response = await client.get("/api/publications/", params={"status": "draft"})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["status"] == "draft"


@pytest.mark.asyncio
async def test_drafts_endpoint(client, db, test_user):
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="draft",
    ))
    db.add(Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.SCHEDULED,
        text_content="scheduled",
    ))
    await db.commit()

    response = await client.get("/api/publications/drafts")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["text_content"] == "draft"
