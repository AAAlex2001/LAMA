from datetime import datetime, timezone

import pytest

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.enums import ContentType, PublicationStatus
from backend.services.publications.features.publications.list_publications import ListPublications


async def make_pub(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=overrides.pop("content_type", DBContentType.TEXT),
        status=overrides.pop("status", DBPublicationStatus.DRAFT),
        text_content=overrides.pop("text_content", "x"),
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_returns_only_owner_publications(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    await make_pub(db, test_user.id, text_content="mine")
    await make_pub(db, other.id, text_content="theirs")

    items = await ListPublications(db).execute(owner_id=test_user.id)

    assert len(items) == 1
    assert items[0].text_content == "mine"


@pytest.mark.asyncio
async def test_filter_by_status(db, test_user):
    await make_pub(db, test_user.id, status=DBPublicationStatus.DRAFT, text_content="d")
    await make_pub(db, test_user.id, status=DBPublicationStatus.SCHEDULED, text_content="s")

    drafts = await ListPublications(db).execute(
        owner_id=test_user.id, status=PublicationStatus.DRAFT,
    )

    assert len(drafts) == 1
    assert drafts[0].status == DBPublicationStatus.DRAFT


@pytest.mark.asyncio
async def test_filter_by_content_type(db, test_user):
    await make_pub(db, test_user.id, content_type=DBContentType.TEXT, text_content="t")
    await make_pub(
        db, test_user.id, content_type=DBContentType.IMAGE,
        text_content=None, media_urls=["http://x/a.jpg"],
    )

    images = await ListPublications(db).execute(
        owner_id=test_user.id, content_type=ContentType.IMAGE,
    )

    assert len(images) == 1
    assert images[0].content_type == DBContentType.IMAGE


@pytest.mark.asyncio
async def test_pagination_slice(db, test_user):
    for i in range(5):
        await make_pub(
            db, test_user.id,
            text_content=f"p{i}",
            scheduled_time=datetime(2026, 5, 10 + i, 12, tzinfo=timezone.utc),
        )

    page1 = await ListPublications(db).execute(owner_id=test_user.id, skip=0, limit=2)
    page2 = await ListPublications(db).execute(owner_id=test_user.id, skip=2, limit=2)

    assert len(page1) == 2
    assert len(page2) == 2
    assert {p.id for p in page1}.isdisjoint({p.id for p in page2})


@pytest.mark.asyncio
async def test_filter_by_is_ad(db, test_user):
    await make_pub(db, test_user.id, is_ad=True, text_content="ad")
    await make_pub(db, test_user.id, is_ad=False, text_content="regular")

    ads = await ListPublications(db).execute(owner_id=test_user.id, is_ad=True)

    assert len(ads) == 1
    assert ads[0].is_ad is True
