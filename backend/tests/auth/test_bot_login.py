"""Тесты логина через бота: AuthenticateBotUser + CreateBotLoginCode + RedeemBotLoginCode."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from backend.models.auth import BotLoginCode
from backend.services.auth.features.bot.authenticate_bot_user import AuthenticateBotUser
from backend.services.auth.features.bot.create_bot_login_code import CreateBotLoginCode
from backend.services.auth.features.bot.redeem_bot_login_code import RedeemBotLoginCode


@pytest.mark.asyncio
async def test_bot_login_creates_user(db, auth_settings):
    result = await AuthenticateBotUser(db, auth_settings).execute(
        telegram_id=10001, username="botuser", first_name="Bot",
    )
    await db.commit()
    assert result.user.telegram_account.telegram_id == 10001
    assert result.access_token
    assert result.refresh_token


@pytest.mark.asyncio
async def test_bot_login_returns_existing_user_for_same_telegram_id(db, auth_settings):
    first = await AuthenticateBotUser(db, auth_settings).execute(telegram_id=20002)
    await db.commit()
    second = await AuthenticateBotUser(db, auth_settings).execute(telegram_id=20002)
    await db.commit()

    assert first.user.id == second.user.id
    assert first.access_token != second.access_token


@pytest.mark.asyncio
async def test_bot_login_rejects_inactive_user(db, auth_settings):
    first = await AuthenticateBotUser(db, auth_settings).execute(telegram_id=30003)
    first.user.is_active = False
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await AuthenticateBotUser(db, auth_settings).execute(telegram_id=30003)
    assert exc.value.status_code == 403


def to_aware_utc(dt):
    """SQLite теряет tzinfo при чтении — приводим к aware UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


@pytest.mark.asyncio
async def test_create_login_code_uses_default_ttl(db):
    code = await CreateBotLoginCode(db).execute(telegram_id=12345)
    await db.commit()
    assert code.code
    assert code.is_used is False
    delta = to_aware_utc(code.expires_at) - datetime.now(timezone.utc)
    assert timedelta(minutes=4) < delta <= timedelta(minutes=5)


@pytest.mark.asyncio
async def test_create_login_code_custom_ttl(db):
    code = await CreateBotLoginCode(db).execute(telegram_id=99, expires_minutes=30)
    await db.commit()
    delta = to_aware_utc(code.expires_at) - datetime.now(timezone.utc)
    assert timedelta(minutes=29) < delta <= timedelta(minutes=30)


@pytest.mark.asyncio
async def test_create_login_code_each_call_unique(db):
    a = await CreateBotLoginCode(db).execute(telegram_id=1)
    b = await CreateBotLoginCode(db).execute(telegram_id=1)
    assert a.code != b.code


@pytest.mark.asyncio
async def test_redeem_login_code_creates_session(db, auth_settings):
    login_code = await CreateBotLoginCode(db).execute(
        telegram_id=44444, username="redeemer", first_name="R",
    )
    await db.commit()

    result = await RedeemBotLoginCode(db, auth_settings).execute(login_code.code)
    await db.commit()
    assert result.user.telegram_account.telegram_id == 44444
    assert result.access_token

    await db.refresh(login_code)
    assert login_code.is_used is True
    assert login_code.used_at is not None


@pytest.mark.asyncio
async def test_redeem_rejects_unknown_code(db, auth_settings):
    with pytest.raises(HTTPException) as exc:
        await RedeemBotLoginCode(db, auth_settings).execute("definitely-not-a-real-code")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_redeem_rejects_used_code(db, auth_settings):
    code = await CreateBotLoginCode(db).execute(telegram_id=55555)
    await db.commit()

    await RedeemBotLoginCode(db, auth_settings).execute(code.code)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await RedeemBotLoginCode(db, auth_settings).execute(code.code)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_redeem_rejects_expired_code(db, auth_settings):
    code = BotLoginCode(
        code="expired-code",
        telegram_id=66666,
        is_used=False,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db.add(code)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await RedeemBotLoginCode(db, auth_settings).execute("expired-code")
    assert exc.value.status_code == 401
