import pytest

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.schemas.publications.enums import ContentType, PublicationStatus
from backend.schemas.publications.publications import PublicationUpdate
from backend.services.publications.features.publications.update_publication import UpdatePublication


async def make_pub(db, owner_id, **overrides):
    pub = Publication(
        owner_id=owner_id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.DRAFT,
        text_content=overrides.pop("text_content", "Original"),
        **overrides,
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return pub


@pytest.mark.asyncio
async def test_updates_only_provided_fields(db, test_user):
    pub = await make_pub(db, test_user.id, text_content="Original")

    updated = await UpdatePublication(db).execute(
        pub, PublicationUpdate(text_content="Edited"), owner_id=test_user.id,
    )
    await db.commit()

    assert updated.text_content == "Edited"
    assert updated.content_type == DBContentType.TEXT  # не менялся


@pytest.mark.asyncio
async def test_serializes_enum_status(db, test_user):
    pub = await make_pub(db, test_user.id)

    updated = await UpdatePublication(db).execute(
        pub, PublicationUpdate(status=PublicationStatus.SCHEDULED), owner_id=test_user.id,
    )
    await db.commit()

    assert updated.status == DBPublicationStatus.SCHEDULED


@pytest.mark.asyncio
async def test_replaces_channels(db, test_user, test_channel):
    from backend.models.channels import ChannelGroup, ChannelType

    pub = await make_pub(db, test_user.id)
    await db.refresh(pub, ["channels"])
    pub.channels = [test_channel]
    await db.commit()

    new_channel = ChannelGroup(
        owner_id=test_user.id,
        telegram_id=-1002,
        channel_type=ChannelType.CHANNEL,
        title="New",
    )
    db.add(new_channel)
    await db.commit()
    await db.refresh(new_channel)

    updated = await UpdatePublication(db).execute(
        pub, PublicationUpdate(channel_ids=[new_channel.id]), owner_id=test_user.id,
    )
    await db.refresh(updated, ["channels"])
    await db.commit()

    assert [c.id for c in updated.channels] == [new_channel.id]


@pytest.mark.asyncio
async def test_normalizes_auto_delete_hours_to_seconds(db, test_user):
    pub = await make_pub(db, test_user.id)

    updated = await UpdatePublication(db).execute(
        pub, PublicationUpdate(auto_delete_hours=3), owner_id=test_user.id,
    )
    await db.commit()

    assert updated.auto_delete_hours == 3
    assert updated.auto_delete_seconds == 3 * 3600


@pytest.mark.asyncio
async def test_empty_payload_keeps_publication(db, test_user):
    pub = await make_pub(db, test_user.id, text_content="Same")

    updated = await UpdatePublication(db).execute(pub, PublicationUpdate(), owner_id=test_user.id)
    await db.commit()

    assert updated.text_content == "Same"
