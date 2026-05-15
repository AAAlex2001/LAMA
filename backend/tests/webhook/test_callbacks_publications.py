"""Тесты callback-обработчиков публикаций: track_button_click + show_hidden_text."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.models.publications import (
    ButtonClick,
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.webhook.features.callbacks.publications.show_hidden_text import (
    ShowHiddenText,
)
from backend.services.webhook.features.callbacks.publications.track_button_click import (
    TrackButtonClick,
)


async def make_publication(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.PUBLISHED,
        text_content="x",
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_track_button_click_inserts_row(db, test_user):
    pub = await make_publication(db, test_user.id)

    await TrackButtonClick(db).execute(pub.id, "btn1", user_id=42)
    await db.commit()

    count = await TrackButtonClick(db).get_count(pub.id, "btn1")
    assert count == 1


@pytest.mark.asyncio
async def test_track_button_click_idempotent_per_user(db, test_user):
    """Один user × button — только один клик в БД."""
    pub = await make_publication(db, test_user.id)

    await TrackButtonClick(db).execute(pub.id, "btn1", user_id=42)
    await TrackButtonClick(db).execute(pub.id, "btn1", user_id=42)
    await db.commit()

    count = await TrackButtonClick(db).get_count(pub.id, "btn1")
    assert count == 1


@pytest.mark.asyncio
async def test_track_button_click_counts_different_users(db, test_user):
    pub = await make_publication(db, test_user.id)

    for uid in [10, 20, 30]:
        await TrackButtonClick(db).execute(pub.id, "btn1", user_id=uid)
    await db.commit()

    count = await TrackButtonClick(db).get_count(pub.id, "btn1")
    assert count == 3


@pytest.mark.asyncio
async def test_get_count_returns_zero_for_no_clicks(db, test_user):
    pub = await make_publication(db, test_user.id)
    count = await TrackButtonClick(db).get_count(pub.id, "nonexistent")
    assert count == 0


def make_callback_query(data="hidden_text:42:btn1", user_id=100, chat_id=-100):
    return SimpleNamespace(
        id="cbid",
        data=data,
        from_user=SimpleNamespace(id=user_id) if user_id else None,
        message=SimpleNamespace(chat=SimpleNamespace(id=chat_id)) if chat_id else None,
    )


@pytest.mark.asyncio
async def test_show_hidden_text_no_op_when_data_unparseable(db, test_bot, monkeypatch):
    """Если callback_data не парсится — выход без вызова Telegram."""
    answer_mock = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.AnswerCallback",
        lambda: SimpleNamespace(execute=answer_mock),
    )

    cb = make_callback_query(data="too_short")
    await ShowHiddenText(db, test_bot).execute(cb)
    answer_mock.assert_not_called()


@pytest.mark.asyncio
async def test_show_hidden_text_no_op_when_button_not_found(db, test_bot, monkeypatch):
    """Если кнопка не найдена в БД — выход."""
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.GetPublicationButton",
        lambda db_: SimpleNamespace(execute=AsyncMock(return_value=None)),
    )
    answer_mock = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.AnswerCallback",
        lambda: SimpleNamespace(execute=answer_mock),
    )

    cb = make_callback_query(data="hidden_text:42:btn1")
    await ShowHiddenText(db, test_bot).execute(cb)
    answer_mock.assert_not_called()


@pytest.mark.asyncio
async def test_show_hidden_text_returns_subscribed_text(db, test_bot, monkeypatch):
    """Подписчик видит subscribed-текст."""
    button = SimpleNamespace(
        hidden_text_subscribed="Secret для подписчика",
        hidden_text_unsubscribed="Подпишись",
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.GetPublicationButton",
        lambda db_: SimpleNamespace(execute=AsyncMock(return_value=button)),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.CheckSubscriber",
        lambda: SimpleNamespace(execute=AsyncMock(return_value=True)),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.resolve_by_token",
        lambda _: SimpleNamespace(),
    )

    answer = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.AnswerCallback",
        lambda: SimpleNamespace(execute=answer),
    )

    await ShowHiddenText(db, test_bot).execute(make_callback_query())
    args, _ = answer.call_args
    assert args[2] == "Secret для подписчика"


@pytest.mark.asyncio
async def test_show_hidden_text_returns_unsubscribed_text(db, test_bot, monkeypatch):
    """Не-подписчик видит unsubscribed-текст."""
    button = SimpleNamespace(
        hidden_text_subscribed="Secret",
        hidden_text_unsubscribed="Подпишись",
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.GetPublicationButton",
        lambda db_: SimpleNamespace(execute=AsyncMock(return_value=button)),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.CheckSubscriber",
        lambda: SimpleNamespace(execute=AsyncMock(return_value=False)),
    )
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.resolve_by_token",
        lambda _: SimpleNamespace(),
    )

    answer = AsyncMock()
    monkeypatch.setattr(
        "backend.services.webhook.features.callbacks.publications.show_hidden_text.AnswerCallback",
        lambda: SimpleNamespace(execute=answer),
    )

    await ShowHiddenText(db, test_bot).execute(make_callback_query())
    args, _ = answer.call_args
    assert args[2] == "Подпишись"
