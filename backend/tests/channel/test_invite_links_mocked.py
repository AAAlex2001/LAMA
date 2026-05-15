"""Тесты create/update/revoke invite-ссылок с моком aiogram-бота."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from aiogram.exceptions import TelegramAPIError
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.channels import ChatInviteLink
from backend.schemas.channels.invite_links import InviteLinkCreate, InviteLinkUpdate
from backend.services.channel.features.invite_links.create_link import CreateInviteLink
from backend.services.channel.features.invite_links.revoke_link import RevokeInviteLink
from backend.services.channel.features.invite_links.update_link import UpdateInviteLink


def fake_tg_link(
    invite_link="https://t.me/+abc",
    name="link",
    creates_join_request=False,
    member_limit=None,
    pending_join_request_count=0,
):
    """Имитирует aiogram ChatInviteLink-ответ."""
    return SimpleNamespace(
        invite_link=invite_link,
        name=name,
        creates_join_request=creates_join_request,
        member_limit=member_limit,
        pending_join_request_count=pending_join_request_count,
    )


def fake_bot(method_name, return_value=None, raises=None):
    """Возвращает фейкового бота с одним методом, возвращающим/бросающим заданное."""
    method = AsyncMock(side_effect=raises) if raises else AsyncMock(return_value=return_value)
    return SimpleNamespace(**{method_name: method})


@pytest.mark.asyncio
async def test_create_link_writes_db(db, test_user, test_channel, monkeypatch):
    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.create_link.resolve_for_channel",
        AsyncMock(return_value=fake_bot(
            "create_chat_invite_link",
            return_value=fake_tg_link("https://t.me/+xyz", name="vip", member_limit=10),
        )),
    )

    link = await CreateInviteLink(db).execute(
        test_channel,
        InviteLinkCreate(name="vip", member_limit=10, creates_join_request=False),
        creator_id=test_user.id,
    )
    await db.commit()

    assert link.id is not None
    assert link.invite_link == "https://t.me/+xyz"
    assert link.name == "vip"
    assert link.member_limit == 10
    assert link.creator_id == test_user.id


@pytest.mark.asyncio
async def test_create_link_400_when_telegram_fails(db, test_user, test_channel, monkeypatch):
    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.create_link.resolve_for_channel",
        AsyncMock(return_value=fake_bot(
            "create_chat_invite_link",
            raises=TelegramAPIError(method=None, message="forbidden"),
        )),
    )

    with pytest.raises(HTTPException) as exc:
        await CreateInviteLink(db).execute(
            test_channel,
            InviteLinkCreate(name="x", creates_join_request=False),
            creator_id=test_user.id,
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_create_link_clears_member_limit_when_join_request(
    db, test_user, test_channel, monkeypatch,
):
    bot = fake_bot(
        "create_chat_invite_link",
        return_value=fake_tg_link(creates_join_request=True),
    )
    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.create_link.resolve_for_channel",
        AsyncMock(return_value=bot),
    )

    await CreateInviteLink(db).execute(
        test_channel,
        InviteLinkCreate(name="req", member_limit=100, creates_join_request=True),
        creator_id=test_user.id,
    )
    await db.commit()

    call_kwargs = bot.create_chat_invite_link.call_args.kwargs
    assert call_kwargs["member_limit"] is None
    assert call_kwargs["creates_join_request"] is True


@pytest.mark.asyncio
async def test_update_link_changes_fields(db, test_channel, monkeypatch):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+old",
        name="old",
        is_primary=False,
        is_revoked=False,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.update_link.resolve_for_channel",
        AsyncMock(return_value=fake_bot(
            "edit_chat_invite_link",
            return_value=fake_tg_link("https://t.me/+old", name="new", member_limit=5),
        )),
    )

    updated = await UpdateInviteLink(db).execute(
        test_channel, link.id, InviteLinkUpdate(name="new", member_limit=5),
    )
    await db.commit()
    assert updated.name == "new"
    assert updated.member_limit == 5


@pytest.mark.asyncio
async def test_update_link_400_for_revoked(db, test_channel, monkeypatch):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+rev",
        is_revoked=True,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    with pytest.raises(HTTPException) as exc:
        await UpdateInviteLink(db).execute(
            test_channel, link.id, InviteLinkUpdate(name="x"),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_update_link_400_for_primary(db, test_channel, monkeypatch):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+pri",
        is_primary=True,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    with pytest.raises(HTTPException) as exc:
        await UpdateInviteLink(db).execute(
            test_channel, link.id, InviteLinkUpdate(name="x"),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_revoke_marks_link(db, test_channel, monkeypatch):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+toRevoke",
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.revoke_link.resolve_for_channel",
        AsyncMock(return_value=fake_bot("revoke_chat_invite_link", return_value=None)),
    )

    revoked = await RevokeInviteLink(db).execute(test_channel, link.id)
    await db.commit()
    assert revoked.is_revoked is True


@pytest.mark.asyncio
async def test_revoke_is_idempotent_when_already_revoked(db, test_channel, monkeypatch):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+x",
        is_revoked=True,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    bot_resolve = AsyncMock()
    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.revoke_link.resolve_for_channel",
        bot_resolve,
    )

    result = await RevokeInviteLink(db).execute(test_channel, link.id)
    assert result.is_revoked is True
    bot_resolve.assert_not_called()


@pytest.mark.asyncio
async def test_revoke_400_for_primary(db, test_channel):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+primary",
        is_primary=True,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    with pytest.raises(HTTPException) as exc:
        await RevokeInviteLink(db).execute(test_channel, link.id)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_revoke_400_when_telegram_fails(db, test_channel, monkeypatch):
    link = ChatInviteLink(
        channel_id=test_channel.id,
        invite_link="https://t.me/+x",
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    monkeypatch.setattr(
        "backend.services.channel.features.invite_links.revoke_link.resolve_for_channel",
        AsyncMock(return_value=fake_bot(
            "revoke_chat_invite_link",
            raises=TelegramAPIError(method=None, message="boom"),
        )),
    )

    with pytest.raises(HTTPException) as exc:
        await RevokeInviteLink(db).execute(test_channel, link.id)
    assert exc.value.status_code == 400
