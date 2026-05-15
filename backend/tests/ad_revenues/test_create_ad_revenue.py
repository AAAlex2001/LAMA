from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select

from backend.models.ad_revenues import AdRevenue
from backend.schemas.ad_revenues.ad_revenue import AdRevenueCreate
from backend.schemas.ad_revenues.enums import AdRevenueType
from backend.services.ad_revenues.features.create_ad_revenue import CreateAdRevenue


@pytest.mark.asyncio
async def test_creates_income_with_all_fields(db, test_user, test_channel):
    payload = AdRevenueCreate(
        type=AdRevenueType.INCOME,
        buyer="Иван Покупатель",
        amount=Decimal("1500.00"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        channel_id=test_channel.id,
    )

    created = await CreateAdRevenue(db).execute(owner_id=test_user.id, payload=payload)

    assert created.id is not None
    assert created.owner_id == test_user.id
    assert created.type == AdRevenueType.INCOME.value
    assert created.amount == Decimal("1500.00")
    assert created.channel_id == test_channel.id


@pytest.mark.asyncio
async def test_resolves_channel_id_from_username(db, test_user, test_channel):
    payload = AdRevenueCreate(
        type=AdRevenueType.EXPENSE,
        amount=Decimal("500"),
        currency="USD",
        revenue_date=date(2026, 5, 15),
        channel_username="@testchannel",
    )

    created = await CreateAdRevenue(db).execute(owner_id=test_user.id, payload=payload)

    assert created.channel_id == test_channel.id


@pytest.mark.asyncio
async def test_does_not_resolve_unknown_username(db, test_user):
    payload = AdRevenueCreate(
        type=AdRevenueType.EXPENSE,
        amount=Decimal("500"),
        currency="USD",
        revenue_date=date(2026, 5, 15),
        channel_username="nosuchchannel",
    )

    created = await CreateAdRevenue(db).execute(owner_id=test_user.id, payload=payload)

    assert created.channel_id is None
    assert created.channel_username == "nosuchchannel"


@pytest.mark.asyncio
async def test_persists_to_db(db, test_user):
    payload = AdRevenueCreate(
        type=AdRevenueType.INCOME,
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
    )

    await CreateAdRevenue(db).execute(owner_id=test_user.id, payload=payload)
    await db.commit()

    rows = (await db.execute(select(AdRevenue).where(AdRevenue.owner_id == test_user.id))).scalars().all()
    assert len(rows) == 1
    assert rows[0].amount == Decimal("100")
