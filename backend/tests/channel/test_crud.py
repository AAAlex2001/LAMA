"""Тесты CRUD каналов: create / update / delete / list."""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.channels import BackupMode, ChannelGroup, ChannelType
from backend.schemas.channels.channel import ChannelGroupCreate, ChannelGroupUpdate
from backend.services.channel.features.crud.create_channel import CreateChannel
from backend.services.channel.features.crud.delete_channel import DeleteChannel
from backend.services.channel.features.crud.list_channels import ListChannels
from backend.services.channel.features.crud.update_channel import UpdateChannel
from backend.services.channel.utils.query_utils import (
    find_channel_or_404,
    get_channel,
    get_channel_by_telegram_id,
)


@pytest.mark.asyncio
async def test_create_channel(db, test_user):
    payload = ChannelGroupCreate(
        telegram_id=-1009999,
        channel_type=ChannelType.CHANNEL,
        title="My Channel",
        username="mychan",
    )
    channel = await CreateChannel(db).execute(payload, owner_id=test_user.id)
    await db.commit()

    assert channel.id is not None
    assert channel.telegram_id == -1009999
    assert channel.owner_id == test_user.id


@pytest.mark.asyncio
async def test_create_is_idempotent_by_telegram_id(db, test_user):
    payload = ChannelGroupCreate(
        telegram_id=-1009999, channel_type=ChannelType.CHANNEL, title="A",
    )
    first = await CreateChannel(db).execute(payload, owner_id=test_user.id)
    await db.commit()
    second = await CreateChannel(db).execute(
        ChannelGroupCreate(telegram_id=-1009999, channel_type=ChannelType.CHANNEL, title="B"),
        owner_id=test_user.id,
    )
    await db.commit()
    assert first.id == second.id


@pytest.mark.asyncio
async def test_update_partial(db, test_user, test_channel):
    updated = await UpdateChannel(db).execute(
        test_channel.id,
        ChannelGroupUpdate(title="Renamed", description="New desc"),
        owner_id=test_user.id,
    )
    await db.commit()
    assert updated.title == "Renamed"
    assert updated.description == "New desc"


@pytest.mark.asyncio
async def test_update_clear_bot_unlinks(db, test_user, test_channel, test_bot):
    test_channel.bot_id = test_bot.id
    await db.commit()

    updated = await UpdateChannel(db).execute(
        test_channel.id, ChannelGroupUpdate(clear_bot=True), owner_id=test_user.id,
    )
    await db.commit()
    assert updated.bot_id is None
    assert updated.is_bot_active is True


@pytest.mark.asyncio
async def test_update_404_for_foreign(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign = ChannelGroup(
        owner_id=other.id, telegram_id=-7, channel_type=ChannelType.CHANNEL, title="X",
    )
    db.add(foreign)
    await db.commit()
    await db.refresh(foreign)

    with pytest.raises(HTTPException) as exc:
        await UpdateChannel(db).execute(
            foreign.id, ChannelGroupUpdate(title="hijack"), owner_id=test_user.id,
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_removes_channel(db, test_user, test_channel):
    cid = test_channel.id
    await DeleteChannel(db).execute(cid, owner_id=test_user.id)
    await db.commit()
    remaining = (await db.execute(
        select(ChannelGroup).where(ChannelGroup.id == cid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_delete_404_for_foreign(db, test_user):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign = ChannelGroup(
        owner_id=other.id, telegram_id=-8, channel_type=ChannelType.CHANNEL, title="X",
    )
    db.add(foreign)
    await db.commit()
    await db.refresh(foreign)

    with pytest.raises(HTTPException) as exc:
        await DeleteChannel(db).execute(foreign.id, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_list_returns_only_owner_channels(db, test_user, test_channel):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    db.add(ChannelGroup(
        owner_id=other.id, telegram_id=-1, channel_type=ChannelType.CHANNEL, title="Other",
    ))
    await db.commit()

    items, total = await ListChannels(db).execute(owner_id=test_user.id, page=1, page_size=10)
    assert total == 1
    assert items[0].id == test_channel.id


@pytest.mark.asyncio
async def test_list_filter_by_channel_type(db, test_user, test_channel):
    db.add(ChannelGroup(
        owner_id=test_user.id, telegram_id=-2,
        channel_type=ChannelType.GROUP, title="Group",
    ))
    await db.commit()

    items, total = await ListChannels(db).execute(
        owner_id=test_user.id, channel_type=ChannelType.GROUP,
    )
    assert total == 1
    assert items[0].channel_type == ChannelType.GROUP


@pytest.mark.asyncio
async def test_list_filter_by_backup_mode(db, test_user, test_channel):
    test_channel.backup_mode = BackupMode.INSTANT
    await db.commit()

    items, total = await ListChannels(db).execute(
        owner_id=test_user.id, backup_mode=BackupMode.INSTANT,
    )
    assert total == 1
    assert items[0].backup_mode == BackupMode.INSTANT


@pytest.mark.asyncio
async def test_list_pagination(db, test_user):
    for i in range(5):
        db.add(ChannelGroup(
            owner_id=test_user.id, telegram_id=-100 - i,
            channel_type=ChannelType.CHANNEL, title=f"ch{i}",
        ))
    await db.commit()

    page1, total = await ListChannels(db).execute(
        owner_id=test_user.id, page=1, page_size=2,
    )
    page2, _ = await ListChannels(db).execute(
        owner_id=test_user.id, page=2, page_size=2,
    )
    assert total == 5
    assert len(page1) == 2
    assert len(page2) == 2
    assert {c.id for c in page1}.isdisjoint({c.id for c in page2})


@pytest.mark.asyncio
async def test_get_channel_filters_by_owner(db, test_user, test_channel):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    found = await get_channel(db, test_channel.id, owner_id=other.id)
    assert found is None


@pytest.mark.asyncio
async def test_find_or_404(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await find_channel_or_404(db, 99999, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_by_telegram_id(db, test_channel):
    found = await get_channel_by_telegram_id(db, test_channel.telegram_id)
    assert found is not None
    assert found.id == test_channel.id
