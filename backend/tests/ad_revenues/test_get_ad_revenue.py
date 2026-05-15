from datetime import date
from decimal import Decimal

import pytest

from backend.models.ad_revenues import AdRevenue
from backend.models.auth import User, UserRole
from backend.services.ad_revenues.features.get_ad_revenue import GetAdRevenue


async def add_ad_revenue(db, owner_id, **overrides):
    row = AdRevenue(
        owner_id=owner_id,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        **overrides,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@pytest.mark.asyncio
async def test_returns_ad_revenue_for_owner(db, test_user):
    row = await add_ad_revenue(db, test_user.id, buyer="X")

    found = await GetAdRevenue(db).execute(row.id, test_user.id)

    assert found is not None
    assert found.id == row.id
    assert found.buyer == "X"


@pytest.mark.asyncio
async def test_returns_none_for_unknown_id(db, test_user):
    found = await GetAdRevenue(db).execute(999, test_user.id)
    assert found is None


@pytest.mark.asyncio
async def test_returns_none_for_other_owner(db, test_user):
    row = await add_ad_revenue(db, test_user.id)
    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    found = await GetAdRevenue(db).execute(row.id, other.id)
    assert found is None
