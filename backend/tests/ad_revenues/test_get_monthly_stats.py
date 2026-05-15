from datetime import date
from decimal import Decimal

import pytest

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import ContentType, Publication, PublicationStatus
from backend.services.ad_revenues.features.get_monthly_stats import GetMonthlyAdStats


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


@pytest.mark.asyncio
async def test_returns_12_months_even_when_empty(db, test_user):
    months = await GetMonthlyAdStats(db).execute(owner_id=test_user.id, year=2026)
    assert len(months) == 12
    assert [m.month for m in months] == list(range(1, 13))
    assert all(m.income == Decimal(0) and m.expense == Decimal(0) for m in months)


@pytest.mark.asyncio
async def test_groups_income_and_expense_by_month(db, test_user):
    await add_ad_revenue(db, test_user.id, type="income", amount=Decimal("1000"),
                        revenue_date=date(2026, 3, 5))
    await add_ad_revenue(db, test_user.id, type="income", amount=Decimal("500"),
                        revenue_date=date(2026, 3, 20))
    await add_ad_revenue(db, test_user.id, type="expense", amount=Decimal("200"),
                        revenue_date=date(2026, 5, 10))

    months = await GetMonthlyAdStats(db).execute(owner_id=test_user.id, year=2026)

    march = next(m for m in months if m.month == 3)
    may = next(m for m in months if m.month == 5)
    assert march.income == Decimal("1500")
    assert march.expense == Decimal(0)
    assert may.income == Decimal(0)
    assert may.expense == Decimal("200")


@pytest.mark.asyncio
async def test_ignores_other_years(db, test_user):
    await add_ad_revenue(db, test_user.id, amount=Decimal("777"),
                        revenue_date=date(2025, 6, 15))

    months = await GetMonthlyAdStats(db).execute(owner_id=test_user.id, year=2026)

    assert all(m.income == Decimal(0) for m in months)


@pytest.mark.asyncio
async def test_filters_by_currency(db, test_user):
    await add_ad_revenue(db, test_user.id, amount=Decimal("100"), currency="RUB",
                        revenue_date=date(2026, 3, 5))
    await add_ad_revenue(db, test_user.id, amount=Decimal("50"), currency="USD",
                        revenue_date=date(2026, 3, 5))

    months_rub = await GetMonthlyAdStats(db).execute(
        owner_id=test_user.id, year=2026, currency="RUB",
    )
    march_rub = next(m for m in months_rub if m.month == 3)
    assert march_rub.income == Decimal("100")


@pytest.mark.asyncio
async def test_includes_publication_ad_income(db, test_user):
    from datetime import datetime, timezone
    pub = Publication(
        owner_id=test_user.id,
        content_type=ContentType.TEXT,
        status=PublicationStatus.PUBLISHED,
        is_ad=True,
        ad_amount=Decimal("333"),
        ad_currency="RUB",
        scheduled_time=datetime(2026, 7, 10, 12, tzinfo=timezone.utc),
    )
    db.add(pub)
    await db.commit()

    months = await GetMonthlyAdStats(db).execute(owner_id=test_user.id, year=2026)
    july = next(m for m in months if m.month == 7)
    assert july.income == Decimal("333")
