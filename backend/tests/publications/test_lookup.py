import pytest
from fastapi import HTTPException

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.publications.features.publications.lookup import (
    find_owned_channels,
    find_publication_or_404,
    get_publication,
)


async def make_pub(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content="X",
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_get_publication_returns_owned(db, test_user):
    pub = await make_pub(db, test_user.id)

    found = await get_publication(db, pub.id, owner_id=test_user.id)
    assert found is not None
    assert found.id == pub.id


@pytest.mark.asyncio
async def test_get_publication_returns_none_for_unknown(db, test_user):
    assert await get_publication(db, 999, owner_id=test_user.id) is None


@pytest.mark.asyncio
async def test_get_publication_filters_by_owner(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    pub = await make_pub(db, other.id)

    assert await get_publication(db, pub.id, owner_id=test_user.id) is None


@pytest.mark.asyncio
async def test_find_or_404_raises_when_missing(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await find_publication_or_404(db, 12345, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_or_404_returns_owned(db, test_user):
    pub = await make_pub(db, test_user.id)
    found = await find_publication_or_404(db, pub.id, owner_id=test_user.id)
    assert found.id == pub.id


@pytest.mark.asyncio
async def test_find_owned_channels_filters_by_owner(db, test_user, test_channel):
    from backend.models.auth import User, UserRole
    from backend.models.channels import ChannelGroup, ChannelType

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign = ChannelGroup(
        owner_id=other.id, telegram_id=-1, channel_type=ChannelType.CHANNEL, title="X",
    )
    db.add(foreign)
    await db.commit()
    await db.refresh(foreign)

    found = await find_owned_channels(db, [test_channel.id, foreign.id], owner_id=test_user.id)
    assert [c.id for c in found] == [test_channel.id]
