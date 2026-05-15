from datetime import date
from decimal import Decimal

import pytest

from backend.models.ad_revenues import AdRevenue
from backend.schemas.ad_revenues.ad_revenue import AdRevenueUpdate
from backend.schemas.ad_revenues.enums import AdRevenueType
from backend.services.ad_revenues.features.update_ad_revenue import UpdateAdRevenue


async def make_row(db, owner_id):
    row = AdRevenue(
        owner_id=owner_id,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        buyer="Old",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@pytest.mark.asyncio
async def test_partial_update_writes_only_provided_fields(db, test_user):
    row = await make_row(db, test_user.id)

    updated = await UpdateAdRevenue(db).execute(
        row, AdRevenueUpdate(amount=Decimal("250.00"), buyer="New")
    )

    assert updated.amount == Decimal("250.00")
    assert updated.buyer == "New"
    assert updated.currency == "RUB"
    assert updated.revenue_date == date(2026, 5, 15)


@pytest.mark.asyncio
async def test_enum_type_serialized_to_string(db, test_user):
    row = await make_row(db, test_user.id)

    updated = await UpdateAdRevenue(db).execute(
        row, AdRevenueUpdate(type=AdRevenueType.EXPENSE)
    )

    assert updated.type == "expense"


@pytest.mark.asyncio
async def test_no_fields_passed_keeps_row(db, test_user):
    row = await make_row(db, test_user.id)

    updated = await UpdateAdRevenue(db).execute(row, AdRevenueUpdate())

    assert updated.amount == Decimal("100")
    assert updated.buyer == "Old"
