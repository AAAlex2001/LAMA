"""Тесты `faq.get_faq_content` / `save_faq_content`."""

import pytest

from backend.models.landing import Locale
from backend.services.landing import faq


@pytest.mark.asyncio
async def test_get_returns_empty_for_unconfigured(db):
    content = await faq.get_faq_content(db, locale="RU")
    assert content["headline"] == ""
    assert content["faqItems"] == []


@pytest.mark.asyncio
async def test_save_then_get(db):
    await faq.save_faq_content(
        db,
        headline="Часто задаваемые вопросы",
        faq_items=[
            {"question": "Q1", "answer": "A1"},
            {"question": "Q2", "answer": "A2"},
        ],
        primary_button_text="Поддержка",
        primary_button_link="https://help.example",
        secondary_button_text=None,
        secondary_button_link=None,
        help_text="Свяжитесь",
        bot_link="https://t.me/help",
        locale=Locale.RU,
    )
    await db.commit()

    content = await faq.get_faq_content(db, locale=Locale.RU)
    assert content["headline"] == "Часто задаваемые вопросы"
    assert len(content["faqItems"]) == 2
    assert content["faqItems"][0] == {"question": "Q1", "answer": "A1"}
    assert content["primaryButtonText"] == "Поддержка"
    assert content["helpText"] == "Свяжитесь"
    assert content["botLink"] == "https://t.me/help"


@pytest.mark.asyncio
async def test_save_replaces_old_items(db):
    await faq.save_faq_content(
        db, headline="x",
        faq_items=[{"question": f"Q{i}", "answer": "a"} for i in range(5)],
        locale=Locale.RU,
    )
    await faq.save_faq_content(
        db, headline="x",
        faq_items=[{"question": "OnlyOne", "answer": "a"}],
        locale=Locale.RU,
    )
    await db.commit()

    content = await faq.get_faq_content(db, locale=Locale.RU)
    assert len(content["faqItems"]) == 1
    assert content["faqItems"][0]["question"] == "OnlyOne"
