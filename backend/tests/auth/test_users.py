"""Тесты CRUD юзеров + stats + sessions."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from backend.models.auth import TelegramAccount, User, UserRole, UserSession
from backend.services.auth.features.sessions.create_user_session import CreateUserSession
from backend.services.auth.features.sessions.list_user_sessions import ListUserSessions
from backend.services.auth.features.sessions.revoke_user_session import RevokeUserSession
from backend.services.auth.features.users.delete_user import DeleteUser
from backend.services.auth.features.users.get_user import GetUser
from backend.services.auth.features.users.get_user_by_email import GetUserByEmail
from backend.services.auth.features.users.get_user_by_telegram_id import GetUserByTelegramId
from backend.services.auth.features.users.get_user_stats import GetUserStats
from backend.services.auth.features.users.list_users import ListUsers
from backend.services.auth.features.users.update_user import UpdateUser


@pytest.mark.asyncio
async def test_get_user_returns_user(db, test_user):
    fetched = await GetUser(db).execute(test_user.id)
    assert fetched.id == test_user.id


@pytest.mark.asyncio
async def test_get_user_404_when_missing(db):
    with pytest.raises(HTTPException) as exc:
        await GetUser(db).execute(99999)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_user_by_email(db, test_user):
    test_user.email = "by-email@x.com"
    await db.commit()

    found = await GetUserByEmail(db).execute("BY-EMAIL@x.com")
    assert found is not None
    assert found.id == test_user.id


@pytest.mark.asyncio
async def test_get_user_by_email_returns_none(db):
    assert await GetUserByEmail(db).execute("missing@x.com") is None


@pytest.mark.asyncio
async def test_get_user_by_telegram_id(db, test_user):
    db.add(TelegramAccount(
        user_id=test_user.id, telegram_id=777777,
        auth_date=datetime.now(timezone.utc),
    ))
    await db.commit()

    found = await GetUserByTelegramId(db).execute(777777)
    assert found is not None
    assert found.id == test_user.id


@pytest.mark.asyncio
async def test_get_user_by_telegram_id_returns_none(db):
    assert await GetUserByTelegramId(db).execute(0) is None


@pytest.mark.asyncio
async def test_list_users_pagination_and_filters(db):
    for i in range(5):
        db.add(User(role=UserRole.USER, is_active=(i % 2 == 0)))
    db.add(User(role=UserRole.ADMIN, is_active=True))
    await db.commit()

    all_users, total = await ListUsers(db).execute()
    assert total == 6

    active_only, total = await ListUsers(db).execute(is_active=True)
    assert total == 4
    assert all(u.is_active for u in active_only)

    admins_only, total = await ListUsers(db).execute(role=UserRole.ADMIN)
    assert total == 1


@pytest.mark.asyncio
async def test_list_users_limit_and_skip(db):
    for _ in range(10):
        db.add(User(role=UserRole.USER, is_active=True))
    await db.commit()

    page, _ = await ListUsers(db).execute(limit=3)
    assert len(page) == 3

    page2, _ = await ListUsers(db).execute(skip=3, limit=3)
    assert len(page2) == 3
    assert {u.id for u in page} & {u.id for u in page2} == set()


@pytest.mark.asyncio
async def test_update_user_role_and_active(db, test_user):
    updated = await UpdateUser(db).execute(test_user.id, role=UserRole.ADMIN, is_active=False)
    assert updated.role == UserRole.ADMIN
    assert updated.is_active is False


@pytest.mark.asyncio
async def test_update_user_partial(db, test_user):
    """Можно передать только одно поле — остальные не трогаются."""
    initial_role = test_user.role
    updated = await UpdateUser(db).execute(test_user.id, is_active=False)
    assert updated.role == initial_role


@pytest.mark.asyncio
async def test_delete_user(db, test_user):
    user_id = test_user.id
    await DeleteUser(db).execute(user_id)
    await db.commit()

    with pytest.raises(HTTPException):
        await GetUser(db).execute(user_id)


@pytest.mark.asyncio
async def test_user_stats_zero_for_clean_user(db, test_user):
    stats = await GetUserStats(db).execute(test_user.id)
    assert stats.user_id == test_user.id
    assert stats.total_bots == 0
    assert stats.total_channels == 0
    assert stats.total_publications == 0
    assert stats.total_sessions == 0


@pytest.mark.asyncio
async def test_create_user_session_writes_row(db, test_user, auth_settings):
    session = await CreateUserSession(db, auth_settings).execute(
        test_user.id, "access-tok", "refresh-tok",
    )
    await db.commit()
    assert session.id is not None
    assert session.access_token == "access-tok"
    assert session.is_active is True


@pytest.mark.asyncio
async def test_list_user_sessions(db, test_user):
    for _ in range(3):
        db.add(UserSession(
            user_id=test_user.id, access_token=f"tok-{_}",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            is_active=True,
        ))
    await db.commit()

    sessions, total = await ListUserSessions(db).execute(test_user.id)
    assert total == 3
    assert len(sessions) == 3


@pytest.mark.asyncio
async def test_revoke_user_session(db, test_user):
    session = UserSession(
        user_id=test_user.id, access_token="revoke-me",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    await RevokeUserSession(db).execute(session.id, test_user.id)
    await db.refresh(session)
    assert session.is_active is False


@pytest.mark.asyncio
async def test_revoke_session_belonging_to_other_user_404(db, test_user, test_admin):
    session = UserSession(
        user_id=test_admin.id, access_token="other-user-token",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_active=True,
    )
    db.add(session)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await RevokeUserSession(db).execute(session.id, test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_revoke_unknown_session_404(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await RevokeUserSession(db).execute(99999, test_user.id)
    assert exc.value.status_code == 404
