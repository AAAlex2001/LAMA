from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import ContentType, Publication, PublicationStatus
from backend.services.ad_revenues.features.delete_ad_revenue import DeleteAdRevenue


async def make_ad_revenue(db, owner_id, publication_id=None):
    row = AdRevenue(
        owner_id=owner_id,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        publication_id=publication_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def make_ad_publication(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=ContentType.TEXT,
        status=PublicationStatus.PUBLISHED,
        is_ad=True,
        ad_buyer="Acme",
        ad_amount=Decimal("500"),
        ad_currency="RUB",
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_delete_positive_id_removes_ad_revenue(db, test_user):
    row = await make_ad_revenue(db, test_user.id)

    deleted = await DeleteAdRevenue(db).execute(row.id, test_user.id)
    await db.commit()

    assert deleted is True
    remaining = (await db.execute(select(AdRevenue).where(AdRevenue.id == row.id))).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_delete_positive_id_clears_linked_publication_ad_fields(db, test_user):
    pub = await make_ad_publication(db, test_user.id)
    row = await make_ad_revenue(db, test_user.id, publication_id=pub.id)

    await DeleteAdRevenue(db).execute(row.id, test_user.id)
    await db.commit()

    refreshed = (await db.execute(select(Publication).where(Publication.id == pub.id))).scalar_one()
    assert refreshed.is_ad is False
    assert refreshed.ad_buyer is None
    assert refreshed.ad_amount is None
    assert refreshed.ad_currency is None


@pytest.mark.asyncio
async def test_delete_negative_id_clears_publication_ad_fields(db, test_user):
    pub = await make_ad_publication(db, test_user.id)

    deleted = await DeleteAdRevenue(db).execute(-pub.id, test_user.id)
    await db.commit()

    assert deleted is True
    refreshed = (await db.execute(select(Publication).where(Publication.id == pub.id))).scalar_one()
    assert refreshed.is_ad is False
    assert refreshed.ad_buyer is None


@pytest.mark.asyncio
async def test_delete_returns_false_when_not_found(db, test_user):
    deleted = await DeleteAdRevenue(db).execute(99999, test_user.id)
    assert deleted is False


@pytest.mark.asyncio
async def test_delete_negative_id_returns_false_for_unknown_publication(db, test_user):
    deleted = await DeleteAdRevenue(db).execute(-99999, test_user.id)
    assert deleted is False


@pytest.mark.asyncio
async def test_delete_does_not_touch_other_owners(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    row = await make_ad_revenue(db, other.id)

    deleted = await DeleteAdRevenue(db).execute(row.id, test_user.id)
    assert deleted is False
