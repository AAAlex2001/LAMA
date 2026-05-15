"""Тесты выпуска/проверки JWT-токенов и refresh-pair."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from jose import jwt

from backend.models.auth import UserSession
from backend.services.auth.features.tokens.create_access_token import CreateAccessToken
from backend.services.auth.features.tokens.create_refresh_token import CreateRefreshToken
from backend.services.auth.features.tokens.logout_session import LogoutSession
from backend.services.auth.features.tokens.refresh_token_pair import (
    RefreshTokenPair,
    decode_refresh_user_id,
)
from backend.services.auth.features.tokens.verify_access_token import VerifyAccessToken


def test_create_access_token_decodes_back(auth_settings):
    token = CreateAccessToken(auth_settings).execute(42)
    payload = jwt.decode(token, auth_settings.jwt_secret, algorithms=[auth_settings.jwt_algorithm])
    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert "jti" in payload
    assert "iat" in payload
    assert "exp" in payload


def test_create_refresh_token_decodes_back(auth_settings):
    token = CreateRefreshToken(auth_settings).execute(7)
    payload = jwt.decode(token, auth_settings.jwt_secret, algorithms=[auth_settings.jwt_algorithm])
    assert payload["sub"] == "7"
    assert payload["type"] == "refresh"


def test_access_and_refresh_have_different_jti(auth_settings):
    access = CreateAccessToken(auth_settings).execute(1)
    refresh = CreateRefreshToken(auth_settings).execute(1)
    access_jti = jwt.decode(access, auth_settings.jwt_secret, algorithms=["HS256"])["jti"]
    refresh_jti = jwt.decode(refresh, auth_settings.jwt_secret, algorithms=["HS256"])["jti"]
    assert access_jti != refresh_jti


def test_decode_refresh_rejects_access_token(auth_settings):
    access = CreateAccessToken(auth_settings).execute(1)
    with pytest.raises(HTTPException) as exc:
        decode_refresh_user_id(access, auth_settings)
    assert exc.value.status_code == 401


def test_decode_refresh_rejects_bad_jwt(auth_settings):
    with pytest.raises(HTTPException) as exc:
        decode_refresh_user_id("not.a.jwt", auth_settings)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_verify_access_returns_user_when_session_active(db, test_user, auth_settings):
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token=access,
        refresh_token=None,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    verified = await VerifyAccessToken(db, auth_settings).execute(access)
    assert verified is not None
    assert verified.id == test_user.id


@pytest.mark.asyncio
async def test_verify_access_returns_none_for_garbage(db, auth_settings):
    assert await VerifyAccessToken(db, auth_settings).execute("garbage") is None


@pytest.mark.asyncio
async def test_verify_access_rejects_refresh_token(db, test_user, auth_settings):
    refresh = CreateRefreshToken(auth_settings).execute(test_user.id)
    assert await VerifyAccessToken(db, auth_settings).execute(refresh) is None


@pytest.mark.asyncio
async def test_verify_access_returns_none_when_session_not_in_db(db, test_user, auth_settings):
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    assert await VerifyAccessToken(db, auth_settings).execute(access) is None


@pytest.mark.asyncio
async def test_verify_access_returns_none_when_session_inactive(db, test_user, auth_settings):
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token=access,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=False,
    )
    db.add(session)
    await db.commit()

    assert await VerifyAccessToken(db, auth_settings).execute(access) is None


@pytest.mark.asyncio
async def test_verify_access_marks_session_inactive_on_expire(db, test_user, auth_settings):
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token=access,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    result = await VerifyAccessToken(db, auth_settings).execute(access)
    await db.refresh(session)
    assert result is None
    assert session.is_active is False


@pytest.mark.asyncio
async def test_verify_access_returns_none_for_inactive_user(db, test_user, auth_settings):
    test_user.is_active = False
    await db.commit()
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token=access,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    assert await VerifyAccessToken(db, auth_settings).execute(access) is None


@pytest.mark.asyncio
async def test_refresh_rotates_tokens(db, test_user, auth_settings):
    refresh = CreateRefreshToken(auth_settings).execute(test_user.id)
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token=access,
        refresh_token=refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    result = await RefreshTokenPair(db, auth_settings).execute(refresh)
    await db.refresh(session)

    assert result.access_token != access
    assert result.refresh_token != refresh
    assert session.access_token == result.access_token
    assert session.refresh_token == result.refresh_token


@pytest.mark.asyncio
async def test_refresh_rejects_missing_session(db, test_user, auth_settings):
    refresh = CreateRefreshToken(auth_settings).execute(test_user.id)
    with pytest.raises(HTTPException) as exc:
        await RefreshTokenPair(db, auth_settings).execute(refresh)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_inactive_user(db, test_user, auth_settings):
    refresh = CreateRefreshToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token="any",
        refresh_token=refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        is_active=True,
    )
    db.add(session)
    test_user.is_active = False
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await RefreshTokenPair(db, auth_settings).execute(refresh)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_logout_marks_session_inactive(db, test_user, auth_settings):
    access = CreateAccessToken(auth_settings).execute(test_user.id)
    session = UserSession(
        user_id=test_user.id,
        access_token=access,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    await LogoutSession(db).execute(access)
    await db.refresh(session)
    assert session.is_active is False


@pytest.mark.asyncio
async def test_logout_raises_for_unknown_token(db):
    with pytest.raises(HTTPException) as exc:
        await LogoutSession(db).execute("does-not-exist")
    assert exc.value.status_code == 401
