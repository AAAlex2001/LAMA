"""Интеграционные тесты роутов /api/ad-revenues через httpx.AsyncClient + asgi-lifespan."""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select

from backend.models.ad_revenues import AdRevenue
from backend.models.publications import ContentType, Publication, PublicationStatus


@pytest.mark.asyncio
async def test_create_returns_201_and_persists(client, db, test_user):
    payload = {
        "type": "income",
        "buyer": "Acme",
        "amount": "1500.00",
        "currency": "RUB",
        "revenue_date": "2026-05-15",
    }

    response = await client.post("/api/ad-revenues/", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["buyer"] == "Acme"
    assert body["type"] == "income"
    assert Decimal(body["amount"]) == Decimal("1500.00")


@pytest.mark.asyncio
async def test_get_returns_existing_ad_revenue(client, db, test_user):
    row = AdRevenue(
        owner_id=test_user.id,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        buyer="X",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    response = await client.get(f"/api/ad-revenues/{row.id}")

    assert response.status_code == 200
    assert response.json()["buyer"] == "X"


@pytest.mark.asyncio
async def test_get_returns_404_for_unknown(client):
    response = await client.get("/api/ad-revenues/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_updates_partial_fields(client, db, test_user):
    row = AdRevenue(
        owner_id=test_user.id,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
        buyer="Old",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    response = await client.patch(
        f"/api/ad-revenues/{row.id}",
        json={"buyer": "New", "amount": "999.99"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["buyer"] == "New"
    assert Decimal(body["amount"]) == Decimal("999.99")
    assert body["currency"] == "RUB"


@pytest.mark.asyncio
async def test_delete_positive_id_removes_row(client, db, session_factory, test_user):
    row = AdRevenue(
        owner_id=test_user.id,
        type="income",
        amount=Decimal("100"),
        currency="RUB",
        revenue_date=date(2026, 5, 15),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    row_id = row.id

    response = await client.delete(f"/api/ad-revenues/{row_id}")

    assert response.status_code == 204
    async with session_factory() as fresh:
        remaining = (await fresh.execute(
            select(AdRevenue).where(AdRevenue.id == row_id)
        )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_delete_negative_id_clears_publication_ad_fields(client, db, session_factory, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=ContentType.TEXT,
        status=PublicationStatus.PUBLISHED,
        is_ad=True,
        ad_buyer="Acme",
        ad_amount=Decimal("500"),
        ad_currency="RUB",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    pub_id = pub.id

    response = await client.delete(f"/api/ad-revenues/{-pub_id}")

    assert response.status_code == 204
    async with session_factory() as fresh:
        refreshed = (await fresh.execute(
            select(Publication).where(Publication.id == pub_id)
        )).scalar_one()
        assert refreshed.is_ad is False
        assert refreshed.ad_buyer is None


@pytest.mark.asyncio
async def test_delete_returns_404_for_unknown(client):
    response = await client.delete("/api/ad-revenues/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_returns_paged_response(client, db, test_user):
    for i in range(3):
        db.add(AdRevenue(
            owner_id=test_user.id,
            type="income",
            amount=Decimal(str(100 + i)),
            currency="RUB",
            revenue_date=date(2026, 5, 10 + i),
        ))
    await db.commit()

    response = await client.get("/api/ad-revenues/", params={"limit": 2})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


@pytest.mark.asyncio
async def test_stats_endpoint_aggregates_income_and_expense(client, db, test_user):
    db.add(AdRevenue(
        owner_id=test_user.id, type="income", amount=Decimal("1000"),
        currency="RUB", revenue_date=date(2026, 5, 15),
    ))
    db.add(AdRevenue(
        owner_id=test_user.id, type="expense", amount=Decimal("300"),
        currency="RUB", revenue_date=date(2026, 5, 15),
    ))
    await db.commit()

    response = await client.get("/api/ad-revenues/stats", params={"currency": "RUB"})

    assert response.status_code == 200
    body = response.json()
    assert Decimal(body["income_total"]) == Decimal("1000")
    assert Decimal(body["expense_total"]) == Decimal("300")
    assert Decimal(body["profit"]) == Decimal("700")


@pytest.mark.asyncio
async def test_export_rejects_unknown_data_type(client):
    response = await client.get(
        "/api/ad-revenues/export",
        params={"data_types": "unknown_type"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_export_returns_xlsx_blob(client, db, test_user):
    db.add(AdRevenue(
        owner_id=test_user.id, type="income", amount=Decimal("100"),
        currency="RUB", revenue_date=date(2026, 5, 15), buyer="Acme",
    ))
    await db.commit()

    response = await client.get(
        "/api/ad-revenues/export",
        params={"data_types": "general_income", "format": "xlsx"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert len(response.content) > 0
