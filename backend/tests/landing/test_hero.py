"""Тесты `hero.get_hero_content` + `save_hero_content`."""

import pytest

from backend.models.landing import Locale
from backend.services.landing import hero


@pytest.mark.asyncio
async def test_get_returns_empty_for_unconfigured(db):
    """Если секция HERO не создавалась — возвращаем пустые поля + пустые массивы."""
    content = await hero.get_hero_content(db, locale="RU")
    assert content["headline"] == ""
    assert content["paragraph"] == ""
    assert content["images"] == []
    assert content["templateImages"] == []


@pytest.mark.asyncio
async def test_save_then_get_round_trip(db):
    await hero.save_hero_content(
        db,
        headline="Заголовок",
        paragraph="Параграф 1",
        paragraph_secondary="Параграф 2",
        button_text="Жми",
        button_url="https://example.com",
        images=[{"url": "https://img/1.png", "alt": "first"}],
        template_images=[{"url": "https://img/t.png", "alt": "tpl"}],
        locale=Locale.RU,
    )
    await db.commit()

    content = await hero.get_hero_content(db, locale=Locale.RU)
    assert content["headline"] == "Заголовок"
    assert content["paragraph"] == "Параграф 1"
    assert content["paragraphSecondary"] == "Параграф 2"
    assert content["buttonText"] == "Жми"
    assert content["buttonUrl"] == "https://example.com"
    assert content["images"] == [{"url": "https://img/1.png", "alt": "first"}]
    assert content["templateImages"] == [{"url": "https://img/t.png", "alt": "tpl"}]


@pytest.mark.asyncio
async def test_save_is_full_replacement(db):
    """save = полная замена под текущую locale, старые ключи удаляются."""
    await hero.save_hero_content(
        db, headline="Old", paragraph="P1", paragraph_secondary="P2",
        button_text="OldBtn", images=[{"url": "old.png", "alt": "x"}],
        locale=Locale.RU,
    )
    await hero.save_hero_content(
        db, headline="New", paragraph="P1", paragraph_secondary="P2",
        button_text="NewBtn", images=[],
        locale=Locale.RU,
    )
    await db.commit()

    content = await hero.get_hero_content(db, locale=Locale.RU)
    assert content["headline"] == "New"
    assert content["buttonText"] == "NewBtn"
    assert content["images"] == []


@pytest.mark.asyncio
async def test_locales_are_independent(db):
    await hero.save_hero_content(
        db, headline="RU-заголовок", paragraph="", paragraph_secondary="",
        button_text="", locale=Locale.RU,
    )
    await hero.save_hero_content(
        db, headline="EN headline", paragraph="", paragraph_secondary="",
        button_text="", locale=Locale.EN,
    )
    await db.commit()

    ru = await hero.get_hero_content(db, locale=Locale.RU)
    en = await hero.get_hero_content(db, locale=Locale.EN)
    sr = await hero.get_hero_content(db, locale=Locale.SR)

    assert ru["headline"] == "RU-заголовок"
    assert en["headline"] == "EN headline"
    assert sr["headline"] == ""


@pytest.mark.asyncio
async def test_coerce_locale_handles_strings_and_enums():
    assert hero.coerce_locale("RU") == Locale.RU
    assert hero.coerce_locale(Locale.EN) == Locale.EN
    assert hero.coerce_locale("garbage") == Locale.RU
    assert hero.coerce_locale(None) == Locale.RU
