from datetime import date
from decimal import Decimal

import pytest

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import ContentType, Publication, PublicationStatus
from backend.schemas.ad_revenues.enums import AdRevenueType
from backend.services.ad_revenues.features.list_ad_revenues import ListAdRevenues


async def add_ad_revenue(db, owner_id, **overrides):
    row = AdRevenue(
        owner_id=owner_id,
        type=overrides.pop("type", "income"),
        amount=overrides.pop("amount", Decimal("100")),
        currency=overrides.pop("currency", "RUB"),
        revenue_date=overrides.pop("revenue_date", date(2026, 5, 15)),
        **overrides,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def add_ad_publication(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=ContentType.TEXT,
        status=overrides.pop("status", PublicationStatus.PUBLISHED),
        is_ad=True,
        ad_buyer=overrides.pop("ad_buyer", None),
        ad_amount=overrides.pop("ad_amount", Decimal("250")),
        ad_currency=overrides.pop("ad_currency", "RUB"),
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_returns_only_owner_records(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    await add_ad_revenue(db, test_user.id, buyer="Mine")
    await add_ad_revenue(db, other.id, buyer="Theirs")

    items, total = await ListAdRevenues(db).execute(owner_id=test_user.id)

    assert total == 1
    assert items[0].buyer == "Mine"


@pytest.mark.asyncio
async def test_includes_synthetic_rows_from_publications(db, test_user):
    await add_ad_revenue(db, test_user.id, amount=Decimal("100"))
    pub = await add_ad_publication(db, test_user.id, ad_amount=Decimal("250"))

    items, total = await ListAdRevenues(db).execute(owner_id=test_user.id)

    assert total == 2
    ids = {i.id for i in items}
    assert -pub.id in ids
    synthetic = next(i for i in items if i.id == -pub.id)
    assert synthetic.amount == Decimal("250")


@pytest.mark.asyncio
async def test_excludes_publication_already_linked_to_ad_revenue(db, test_user):
    pub = await add_ad_publication(db, test_user.id)
    await add_ad_revenue(db, test_user.id, publication_id=pub.id)

    items, _ = await ListAdRevenues(db).execute(owner_id=test_user.id)

    # должно быть ровно одно — через AdRevenue, а не через publication
    assert len(items) == 1
    assert items[0].id > 0
    assert items[0].publication_id == pub.id


@pytest.mark.asyncio
async def test_filter_by_type_income_keeps_synthetic(db, test_user):
    await add_ad_revenue(db, test_user.id, type="expense")
    await add_ad_publication(db, test_user.id)

    items, total = await ListAdRevenues(db).execute(
        owner_id=test_user.id, type_=AdRevenueType.INCOME
    )

    assert total == 1
    assert items[0].id < 0  # синтетическая


@pytest.mark.asyncio
async def test_filter_by_type_expense_excludes_synthetic(db, test_user):
    await add_ad_revenue(db, test_user.id, type="expense", amount=Decimal("500"))
    await add_ad_publication(db, test_user.id)

    items, total = await ListAdRevenues(db).execute(
        owner_id=test_user.id, type_=AdRevenueType.EXPENSE
    )

    assert total == 1
    assert items[0].amount == Decimal("500")


@pytest.mark.asyncio
async def test_pagination_returns_total_independently_of_limit(db, test_user):
    for i in range(5):
        await add_ad_revenue(db, test_user.id, amount=Decimal(str(i)), revenue_date=date(2026, 5, 10 + i))

    items, total = await ListAdRevenues(db).execute(owner_id=test_user.id, limit=2, offset=0)

    assert total == 5
    assert len(items) == 2
