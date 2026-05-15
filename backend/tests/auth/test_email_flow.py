"""Тесты email/password регистрации и логина."""

import pytest
from fastapi import HTTPException

from backend.services.auth.features.email.add_email_to_user import AddEmailToUser
from backend.services.auth.features.email.login_with_email import LoginWithEmail
from backend.services.auth.features.email.register_with_email import RegisterWithEmail


@pytest.mark.asyncio
async def test_register_creates_user_with_tokens(db, auth_settings):
    result = await RegisterWithEmail(db, auth_settings).execute(
        email="user@example.com", password="MyPass_123",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()
    assert result.user.email == "user@example.com"
    assert result.user.password_hash
    assert result.user.password_hash != "MyPass_123"
    assert result.access_token


@pytest.mark.asyncio
async def test_register_normalizes_email(db, auth_settings):
    result = await RegisterWithEmail(db, auth_settings).execute(
        email="Mixed@Case.COM", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()
    assert result.user.email == "mixed@case.com"


@pytest.mark.asyncio
async def test_register_rejects_without_consent(db, auth_settings):
    for consent in [{"agree_personal_data": False}, {"agree_terms": False}]:
        kwargs = {"agree_personal_data": True, "agree_terms": True, **consent}
        with pytest.raises(HTTPException) as exc:
            await RegisterWithEmail(db, auth_settings).execute(
                email="x@x.com", password="pwd_pwd_pwd", **kwargs,
            )
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(db, auth_settings):
    await RegisterWithEmail(db, auth_settings).execute(
        email="dup@x.com", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await RegisterWithEmail(db, auth_settings).execute(
            email="dup@x.com", password="other_password",
            agree_personal_data=True, agree_terms=True,
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_login_succeeds_with_correct_password(db, auth_settings):
    await RegisterWithEmail(db, auth_settings).execute(
        email="login@x.com", password="MyPass_999",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()

    result = await LoginWithEmail(db, auth_settings).execute(
        email="login@x.com", password="MyPass_999",
    )
    await db.commit()
    assert result.user.email == "login@x.com"
    assert result.access_token


@pytest.mark.asyncio
async def test_login_normalizes_email(db, auth_settings):
    await RegisterWithEmail(db, auth_settings).execute(
        email="lower@x.com", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()

    result = await LoginWithEmail(db, auth_settings).execute(
        email="LOWER@x.com", password="pwd_pwd_pwd",
    )
    assert result.user.id


@pytest.mark.asyncio
async def test_login_rejects_unknown_email(db, auth_settings):
    with pytest.raises(HTTPException) as exc:
        await LoginWithEmail(db, auth_settings).execute(
            email="nobody@x.com", password="any",
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(db, auth_settings):
    await RegisterWithEmail(db, auth_settings).execute(
        email="user@x.com", password="real_pass",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await LoginWithEmail(db, auth_settings).execute(
            email="user@x.com", password="wrong_pass",
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_telegram_only_user(db, auth_settings, test_user):
    """У юзера нет password_hash — 400."""
    test_user.email = "tg@x.com"
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await LoginWithEmail(db, auth_settings).execute(email="tg@x.com", password="any")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_login_rejects_deactivated_user(db, auth_settings):
    result = await RegisterWithEmail(db, auth_settings).execute(
        email="off@x.com", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    result.user.is_active = False
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await LoginWithEmail(db, auth_settings).execute(email="off@x.com", password="pwd_pwd_pwd")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_add_email_to_existing_user(db, test_user):
    user = await AddEmailToUser(db).execute(
        user_id=test_user.id, email="new@x.com", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()
    assert user.email == "new@x.com"
    assert user.password_hash


@pytest.mark.asyncio
async def test_add_email_rejects_email_used_by_other(db, test_user, auth_settings):
    await RegisterWithEmail(db, auth_settings).execute(
        email="taken@x.com", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await AddEmailToUser(db).execute(
            user_id=test_user.id, email="taken@x.com", password="other",
            agree_personal_data=True, agree_terms=True,
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_add_email_allows_same_user_re_add(db, auth_settings):
    """Тот же юзер обновляет свой email — 200."""
    first = await RegisterWithEmail(db, auth_settings).execute(
        email="mine@x.com", password="pwd_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()

    updated = await AddEmailToUser(db).execute(
        user_id=first.user.id, email="mine@x.com", password="new_pwd_pwd",
        agree_personal_data=True, agree_terms=True,
    )
    await db.commit()
    assert updated.id == first.user.id
