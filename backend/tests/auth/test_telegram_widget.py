"""Тесты HMAC-проверки Telegram Login Widget + Upsert."""

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from backend.models.auth import TelegramAccount, User
from backend.services.auth.features.telegram.authenticate_telegram_widget import (
    AuthenticateTelegramWidget,
)
from backend.services.auth.features.telegram.upsert_telegram_user import UpsertTelegramUser
from backend.services.auth.features.telegram.verify_telegram_widget import (
    VerifyTelegramWidget,
    compute_widget_hash,
)
from backend.services.auth.types import TelegramAuthData


def make_auth_data(bot_token: str, **overrides) -> TelegramAuthData:
    """Создаёт корректно подписанный TelegramAuthData."""
    base = {
        "id": 42,
        "first_name": "Test",
        "last_name": "User",
        "username": "tester",
        "photo_url": None,
        "auth_date": int(datetime.now(timezone.utc).timestamp()),
    }
    base.update(overrides)
    partial = TelegramAuthData(**base, hash="")
    return TelegramAuthData(
        id=partial.id,
        first_name=partial.first_name,
        last_name=partial.last_name,
        username=partial.username,
        photo_url=partial.photo_url,
        auth_date=partial.auth_date,
        hash=compute_widget_hash(bot_token, partial),
    )


def test_verify_accepts_correct_hash(auth_settings):
    data = make_auth_data(auth_settings.bot_token)
    VerifyTelegramWidget(auth_settings).execute(data)


def test_verify_rejects_wrong_hash(auth_settings):
    data = make_auth_data(auth_settings.bot_token)
    tampered = TelegramAuthData(
        id=data.id, first_name=data.first_name, last_name=data.last_name,
        username=data.username, photo_url=data.photo_url,
        auth_date=data.auth_date, hash="0" * 64,
    )
    with pytest.raises(HTTPException) as exc:
        VerifyTelegramWidget(auth_settings).execute(tampered)
    assert exc.value.status_code == 401


def test_verify_rejects_old_auth_date(auth_settings):
    old_ts = int((datetime.now(timezone.utc).timestamp())) - 86401
    data = make_auth_data(auth_settings.bot_token, auth_date=old_ts)
    with pytest.raises(HTTPException) as exc:
        VerifyTelegramWidget(auth_settings).execute(data)
    assert exc.value.status_code == 401


def test_verify_rejects_modified_data(auth_settings):
    """Изменили данные после подписи — HMAC не сойдётся."""
    data = make_auth_data(auth_settings.bot_token)
    forged = TelegramAuthData(
        id=99,
        first_name=data.first_name, last_name=data.last_name,
        username=data.username, photo_url=data.photo_url,
        auth_date=data.auth_date, hash=data.hash,
    )
    with pytest.raises(HTTPException):
        VerifyTelegramWidget(auth_settings).execute(forged)


def test_verify_works_without_optional_fields(auth_settings):
    data = make_auth_data(auth_settings.bot_token, last_name=None, username=None, photo_url=None)
    VerifyTelegramWidget(auth_settings).execute(data)


@pytest.mark.asyncio
async def test_upsert_creates_new_user(db):
    user = await UpsertTelegramUser(db).execute(
        telegram_id=100, username="newbie", first_name="N",
    )
    await db.commit()
    assert user.id is not None
    assert user.telegram_account.telegram_id == 100
    assert user.telegram_account.username == "newbie"


@pytest.mark.asyncio
async def test_upsert_updates_existing_account(db):
    user = await UpsertTelegramUser(db).execute(telegram_id=100, username="old")
    await db.commit()
    same_user = await UpsertTelegramUser(db).execute(telegram_id=100, username="new")
    await db.commit()

    assert same_user.id == user.id
    assert same_user.telegram_account.username == "new"


@pytest.mark.asyncio
async def test_upsert_writes_auth_date(db):
    moment = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    user = await UpsertTelegramUser(db).execute(telegram_id=200, auth_date=moment)
    await db.commit()
    assert user.telegram_account.auth_date == moment


@pytest.mark.asyncio
async def test_authenticate_widget_creates_user_and_session(db, auth_settings):
    data = make_auth_data(auth_settings.bot_token, id=555)
    result = await AuthenticateTelegramWidget(db, auth_settings).execute(data)
    await db.commit()

    assert result.user.telegram_account.telegram_id == 555
    assert result.access_token
    assert result.refresh_token
    assert result.access_token != result.refresh_token


@pytest.mark.asyncio
async def test_authenticate_widget_rejects_inactive_user(db, auth_settings):
    """Если юзер уже существует и deactivated — 403, никакого нового токена."""
    user = User(role="USER", is_active=False)
    db.add(user)
    await db.flush()
    db.add(TelegramAccount(
        user_id=user.id, telegram_id=777, first_name="X",
        auth_date=datetime.now(timezone.utc),
    ))
    await db.commit()

    data = make_auth_data(auth_settings.bot_token, id=777)
    with pytest.raises(HTTPException) as exc:
        await AuthenticateTelegramWidget(db, auth_settings).execute(data)
    assert exc.value.status_code == 403
