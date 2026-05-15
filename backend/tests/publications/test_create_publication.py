from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.channels import ChannelGroup, ChannelType
from backend.models.publications import Publication, PublicationStatus as DBPublicationStatus
from backend.schemas.publications.enums import ContentType, PublicationStatus
from backend.schemas.publications.publications import PublicationCreate
from backend.services.publications.features.publications.create_publication import CreatePublication


def make_text_payload(**overrides) -> PublicationCreate:
    defaults = dict(
        content_type=ContentType.TEXT,
        text_content="Hello world",
        status=PublicationStatus.DRAFT,
    )
    defaults.update(overrides)
    return PublicationCreate(**defaults)


@pytest.mark.asyncio
async def test_creates_text_draft(db, test_user):
    payload = make_text_payload()

    publication = await CreatePublication(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    assert publication.id is not None
    assert publication.owner_id == test_user.id
    assert publication.text_content == "Hello world"
    assert publication.status == DBPublicationStatus.DRAFT


@pytest.mark.asyncio
async def test_attaches_owned_channel(db, test_user, test_channel):
    payload = make_text_payload(channel_ids=[test_channel.id])

    publication = await CreatePublication(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    assert len(publication.channels) == 1
    assert publication.channels[0].id == test_channel.id


@pytest.mark.asyncio
async def test_rejects_foreign_channel(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign = ChannelGroup(
        owner_id=other.id,
        telegram_id=-1009999999,
        channel_type=ChannelType.CHANNEL,
        title="Not mine",
    )
    db.add(foreign)
    await db.commit()
    await db.refresh(foreign)

    payload = make_text_payload(channel_ids=[foreign.id])

    with pytest.raises(HTTPException) as exc:
        await CreatePublication(db).execute(payload, owner_id=test_user.id)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_resolves_auto_delete_seconds_from_hours(db, test_user):
    payload = make_text_payload(auto_delete_hours=2)

    publication = await CreatePublication(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    assert publication.auto_delete_hours == 2
    assert publication.auto_delete_seconds == 2 * 3600


@pytest.mark.asyncio
async def test_keeps_ad_fields(db, test_user):
    payload = make_text_payload(
        is_ad=True, ad_buyer="Acme", ad_amount=Decimal("1500"), ad_currency="RUB",
    )

    publication = await CreatePublication(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    assert publication.is_ad is True
    assert publication.ad_buyer == "Acme"
    assert publication.ad_amount == Decimal("1500")


@pytest.mark.asyncio
async def test_creates_tags_via_get_or_create(db, test_user):
    payload = make_text_payload(tag_names=["news", "deals"])

    publication = await CreatePublication(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    names = sorted(t.name for t in publication.tags)
    assert names == ["deals", "news"]


@pytest.mark.asyncio
async def test_writes_to_db(db, test_user):
    payload = make_text_payload(text_content="Persisted")

    await CreatePublication(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    rows = (await db.execute(
        select(Publication).where(Publication.owner_id == test_user.id)
    )).scalars().all()
    assert len(rows) == 1
    assert rows[0].text_content == "Persisted"
