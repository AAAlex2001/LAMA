"""Тесты для CRUD-операций над ChatInviteLink, которые НЕ ходят в Telegram.

list / delete / lookup можно тестировать на чистой БД. create/refresh/revoke/update
требуют живого aiogram-бота и тестируются отдельно (integration через мок).
"""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.channels import ChatInviteLink
from backend.services.channel.features.invite_links.delete_link import DeleteInviteLink
from backend.services.channel.features.invite_links.list_links import ListInviteLinks
from backend.services.channel.features.invite_links.lookup import (
    find_invite_link_or_404,
    to_expire_timestamp,
)


async def make_link(db, channel_id, invite_link, **overrides):
    link = ChatInviteLink(
        channel_id=channel_id,
        invite_link=invite_link,
        **overrides,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@pytest.mark.asyncio
async def test_list_returns_links_newest_first(db, test_channel):
    for tail in ["aaa", "bbb", "ccc"]:
        await make_link(db, test_channel.id, f"https://t.me/+{tail}")

    links = await ListInviteLinks(db).execute(test_channel.id)
    assert len(links) == 3
    assert links[0].id > links[1].id > links[2].id


@pytest.mark.asyncio
async def test_list_returns_only_channel_links(db, test_user, test_channel):
    from backend.models.channels import ChannelGroup, ChannelType

    other = ChannelGroup(
        owner_id=test_user.id, telegram_id=-77,
        channel_type=ChannelType.CHANNEL, title="Other",
    )
    db.add(other)
    await db.commit()
    await db.refresh(other)

    await make_link(db, test_channel.id, "https://t.me/+mine")
    await make_link(db, other.id, "https://t.me/+theirs")

    links = await ListInviteLinks(db).execute(test_channel.id)
    assert len(links) == 1
    assert links[0].invite_link == "https://t.me/+mine"


@pytest.mark.asyncio
async def test_find_or_404_returns_existing(db, test_channel):
    link = await make_link(db, test_channel.id, "https://t.me/+x")
    found = await find_invite_link_or_404(db, link.id, test_channel.id)
    assert found.id == link.id


@pytest.mark.asyncio
async def test_find_or_404_raises_for_unknown(db, test_channel):
    with pytest.raises(HTTPException) as exc:
        await find_invite_link_or_404(db, 99999, test_channel.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_or_404_raises_for_other_channel(db, test_user, test_channel):
    from backend.models.channels import ChannelGroup, ChannelType

    other = ChannelGroup(
        owner_id=test_user.id, telegram_id=-78,
        channel_type=ChannelType.CHANNEL, title="Other",
    )
    db.add(other)
    await db.commit()
    await db.refresh(other)

    link = await make_link(db, other.id, "https://t.me/+notmine")
    with pytest.raises(HTTPException) as exc:
        await find_invite_link_or_404(db, link.id, test_channel.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_removes_link(db, test_channel):
    link = await make_link(db, test_channel.id, "https://t.me/+gone")
    lid = link.id

    await DeleteInviteLink(db).execute(link.id, test_channel.id)
    await db.commit()

    remaining = (await db.execute(
        select(ChatInviteLink).where(ChatInviteLink.id == lid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_delete_404_for_unknown(db, test_channel):
    with pytest.raises(HTTPException) as exc:
        await DeleteInviteLink(db).execute(99999, test_channel.id)
    assert exc.value.status_code == 404


def test_to_expire_timestamp_none():
    assert to_expire_timestamp(None) is None


def test_to_expire_timestamp_converts():
    from datetime import datetime, timezone
    dt = datetime(2026, 5, 15, 12, 0, tzinfo=timezone.utc)
    assert to_expire_timestamp(dt) == int(dt.timestamp())
