from datetime import date
from decimal import Decimal

import pytest

from backend.models.ad_revenues import AdRevenue
from backend.models.channels import ChannelGroup, ChannelType
from backend.services.ad_revenues.features.get_community_stats import GetCommunityStats


async def add_channel(db, owner_id, **overrides):
    ch = ChannelGroup(
        owner_id=owner_id,
        telegram_id=overrides.pop("telegram_id", -100_000_000_000 - id(overrides)),
        channel_type=overrides.pop("channel_type", ChannelType.CHANNEL),
        title=overrides.pop("title", "Channel"),
        username=overrides.pop("username", None),
        **overrides,
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


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
async def test_returns_empty_when_no_data(db, test_user):
    items = await GetCommunityStats(db).execute(owner_id=test_user.id)
    assert items == []


@pytest.mark.asyncio
async def test_groups_income_and_expense_per_channel(db, test_user):
    ch = await add_channel(db, test_user.id, title="My Channel")
    await add_ad_revenue(db, test_user.id, channel_id=ch.id, type="income",
                        amount=Decimal("500"))
    await add_ad_revenue(db, test_user.id, channel_id=ch.id, type="income",
                        amount=Decimal("300"))
    await add_ad_revenue(db, test_user.id, channel_id=ch.id, type="expense",
                        amount=Decimal("150"))

    items = await GetCommunityStats(db).execute(owner_id=test_user.id)

    assert len(items) == 1
    assert items[0].id == ch.id
    assert items[0].income == Decimal("800")
    assert items[0].expense == Decimal("150")


@pytest.mark.asyncio
async def test_resolves_channel_by_username(db, test_user):
    """Расход без channel_id, но с channel_username должен попасть в канал."""
    ch = await add_channel(db, test_user.id, username="mychannel")
    await add_ad_revenue(db, test_user.id, channel_id=None,
                        channel_username="mychannel", type="expense",
                        amount=Decimal("400"))

    items = await GetCommunityStats(db).execute(owner_id=test_user.id)

    assert len(items) == 1
    assert items[0].id == ch.id
    assert items[0].expense == Decimal("400")


@pytest.mark.asyncio
async def test_filter_by_kind_groups(db, test_user):
    await add_channel(db, test_user.id, channel_type=ChannelType.CHANNEL, title="C")
    grp = await add_channel(db, test_user.id, channel_type=ChannelType.GROUP, title="G",
                           telegram_id=-2)
    await add_ad_revenue(db, test_user.id, channel_id=grp.id)

    items = await GetCommunityStats(db).execute(owner_id=test_user.id, kind="groups")

    assert all(i.kind == "group" for i in items)


@pytest.mark.asyncio
async def test_isolates_owners(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    ch_other = await add_channel(db, other.id, title="Other ch", telegram_id=-9999)
    await add_ad_revenue(db, other.id, channel_id=ch_other.id, amount=Decimal("999"))

    items = await GetCommunityStats(db).execute(owner_id=test_user.id)
    assert items == []
