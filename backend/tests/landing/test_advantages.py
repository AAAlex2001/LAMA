"""Тесты `advantages` — преимущества с авто-slug + UID."""

import pytest

from backend.models.landing import Locale
from backend.services.landing import advantages


@pytest.mark.asyncio
async def test_get_returns_empty_when_no_section(db):
    content = await advantages.get_advantages_content(db, locale="RU")
    assert content["headline"] == ""
    assert content["cards"] == []


@pytest.mark.asyncio
async def test_save_then_get(db):
    await advantages.save_advantages_content(
        db, headline="H", subtitle="S",
        cards=[
            {"uid": None, "slug": None, "title": "Простота", "description": "D", "isCta": False},
            {"uid": None, "slug": None, "title": "Power", "description": "D2", "isCta": False},
        ],
        locale=Locale.RU,
    )
    await db.commit()

    content = await advantages.get_advantages_content(db, locale=Locale.RU)
    assert content["headline"] == "H"
    assert content["subtitle"] == "S"
    assert len(content["cards"]) == 2


@pytest.mark.asyncio
async def test_save_generates_slug_from_title(db):
    await advantages.save_advantages_content(
        db, headline="H", subtitle="",
        cards=[{"uid": None, "slug": None, "title": "Простота", "description": "D", "isCta": False}],
        locale=Locale.RU,
    )
    await db.commit()

    content = await advantages.get_advantages_content(db, locale=Locale.RU)
    assert content["cards"][0]["slug"] == "prostota"


@pytest.mark.asyncio
async def test_save_preserves_explicit_uid_and_slug(db):
    await advantages.save_advantages_content(
        db, headline="H", subtitle="",
        cards=[{
            "uid": "fixed-uid",
            "slug": "custom-slug",
            "title": "ОжидаемыйSlug",
            "description": "D",
            "isCta": False,
        }],
        locale=Locale.RU,
    )
    await db.commit()

    content = await advantages.get_advantages_content(db, locale=Locale.RU)
    assert content["cards"][0]["uid"] == "fixed-uid"
    assert content["cards"][0]["slug"] == "custom-slug"
