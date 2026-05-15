"""Тесты share-токенов: generate / get / consume."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.publications.features.sharing.consume_share_token import ConsumeShareToken
from backend.services.publications.features.sharing.generate_share_token import GenerateShareToken
from backend.services.publications.features.sharing.get_publication_by_token import (
    GetPublicationByShareToken,
)


async def make_publication(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="share me",
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_generate_returns_token_and_sets_fields(db, test_user):
    pub = await make_publication(db, test_user.id)

    token = await GenerateShareToken(db).execute(pub.id, owner_id=test_user.id)
    await db.commit()
    await db.refresh(pub)

    assert isinstance(token, str)
    assert len(token) >= 32
    assert pub.share_token == token
    assert pub.share_token_used is False
    expires = pub.share_token_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    assert expires > datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_generate_404_for_foreign(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    pub = await make_publication(db, other.id)

    with pytest.raises(HTTPException) as exc:
        await GenerateShareToken(db).execute(pub.id, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_by_token_returns_publication(db, test_user):
    pub = await make_publication(db, test_user.id)
    token = await GenerateShareToken(db).execute(pub.id, owner_id=test_user.id)
    await db.commit()

    found = await GetPublicationByShareToken(db).execute(token)
    assert found.id == pub.id


@pytest.mark.asyncio
async def test_get_by_token_404_for_unknown(db):
    with pytest.raises(HTTPException) as exc:
        await GetPublicationByShareToken(db).execute("does-not-exist")
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_by_token_404_for_used(db, test_user):
    pub = await make_publication(db, test_user.id)
    token = await GenerateShareToken(db).execute(pub.id, owner_id=test_user.id)
    await db.commit()
    await ConsumeShareToken(db).execute(token)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await GetPublicationByShareToken(db).execute(token)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_by_token_404_for_expired(db, test_user):
    pub = await make_publication(db, test_user.id)
    pub.share_token = "expired-token"
    pub.share_token_used = False
    pub.share_token_expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await GetPublicationByShareToken(db).execute("expired-token")
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_consume_marks_used(db, test_user):
    pub = await make_publication(db, test_user.id)
    token = await GenerateShareToken(db).execute(pub.id, owner_id=test_user.id)
    await db.commit()

    result = await ConsumeShareToken(db).execute(token)
    await db.commit()
    await db.refresh(pub)

    assert result is True
    assert pub.share_token_used is True


@pytest.mark.asyncio
async def test_consume_404_for_unknown(db):
    with pytest.raises(HTTPException) as exc:
        await ConsumeShareToken(db).execute("nope")
    assert exc.value.status_code == 404
