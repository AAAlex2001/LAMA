"""Тесты CRUD-сервисов ботов: create / update / delete / activate / deactivate / list / lookup."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.bots import Bot, BotStatus
from backend.schemas.bots.bot import BotCreate, BotUpdate
from backend.services.bot.features.crud.activate_bot import ActivateBot
from backend.services.bot.features.crud.create_bot import CreateBot
from backend.services.bot.features.crud.deactivate_bot import DeactivateBot
from backend.services.bot.features.crud.delete_bot import DeleteBot
from backend.services.bot.features.crud.list_bots import ListBots
from backend.services.bot.features.crud.lookup import (
    find_bot_or_404,
    get_bot,
    get_bot_by_telegram_id,
)
from backend.services.bot.features.crud.update_bot import UpdateBot


def fake_bot_info(telegram_id=987654321, username="newbot", first_name="New Bot"):
    return SimpleNamespace(id=telegram_id, username=username, first_name=first_name)


@pytest.mark.asyncio
async def test_create_bot(db, test_user, monkeypatch):
    monkeypatch.setattr(
        "backend.services.bot.features.crud.create_bot.fetch_bot_info",
        AsyncMock(return_value=(fake_bot_info(), "Описание", "Краткое")),
    )

    bot = await CreateBot(db).execute(
        BotCreate(token="123:fake_token_abc"),
        owner_id=test_user.id,
    )
    await db.commit()

    assert bot.id is not None
    assert bot.telegram_id == 987654321
    assert bot.username == "newbot"
    assert bot.status == BotStatus.ACTIVE
    assert bot.is_webhook_enabled is True


@pytest.mark.asyncio
async def test_create_rejects_owner_duplicate(db, test_user, test_bot, monkeypatch):
    monkeypatch.setattr(
        "backend.services.bot.features.crud.create_bot.fetch_bot_info",
        AsyncMock(return_value=(fake_bot_info(telegram_id=test_bot.telegram_id), None, None)),
    )

    with pytest.raises(HTTPException) as exc:
        await CreateBot(db).execute(
            BotCreate(token="123:any_token"),
            owner_id=test_user.id,
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_create_rejects_foreign_duplicate(db, test_user, monkeypatch):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    foreign_bot = Bot(
        owner_id=other.id, telegram_id=555, username="x", first_name="x",
        token="0:0", status=BotStatus.ACTIVE,
    )
    db.add(foreign_bot)
    await db.commit()

    monkeypatch.setattr(
        "backend.services.bot.features.crud.create_bot.fetch_bot_info",
        AsyncMock(return_value=(fake_bot_info(telegram_id=555), None, None)),
    )

    with pytest.raises(HTTPException) as exc:
        await CreateBot(db).execute(
            BotCreate(token="999:fake_token_xyz"),
            owner_id=test_user.id,
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_update_bot_partial(db, test_user, test_bot, monkeypatch):
    monkeypatch.setattr(
        "backend.services.bot.features.crud.update_bot.needs_telegram_sync",
        lambda new_name, data: False,
    )

    updated = await UpdateBot(db).execute(
        test_bot.id, BotUpdate(short_description="Новое короткое"),
        owner_id=test_user.id,
    )
    await db.commit()
    assert updated.short_description == "Новое короткое"


@pytest.mark.asyncio
async def test_update_404_for_foreign(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await UpdateBot(db).execute(
            99999, BotUpdate(description="x"), owner_id=test_user.id,
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_bot_removes_row(db, test_user, test_bot):
    bid = test_bot.id
    await DeleteBot(db).execute(bid, owner_id=test_user.id)
    await db.commit()
    remaining = (await db.execute(
        select(Bot).where(Bot.id == bid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_delete_404_for_foreign(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await DeleteBot(db).execute(99999, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_activate_sets_active(db, test_user, test_bot):
    test_bot.status = BotStatus.INACTIVE
    await db.commit()

    bot = await ActivateBot(db).execute(test_bot.id, owner_id=test_user.id)
    await db.commit()
    assert bot.status == BotStatus.ACTIVE


@pytest.mark.asyncio
async def test_deactivate_sets_inactive(db, test_user, test_bot):
    bot = await DeactivateBot(db).execute(test_bot.id, owner_id=test_user.id)
    await db.commit()
    assert bot.status == BotStatus.INACTIVE


@pytest.mark.asyncio
async def test_list_returns_only_owner(db, test_user, test_bot):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)
    db.add(Bot(
        owner_id=other.id, telegram_id=777, username="foreign",
        first_name="F", token="7:7", status=BotStatus.ACTIVE,
    ))
    await db.commit()

    bots, total = await ListBots(db).execute(owner_id=test_user.id)
    assert total == 1
    assert bots[0].id == test_bot.id


@pytest.mark.asyncio
async def test_list_filters_by_status(db, test_user, test_bot):
    db.add(Bot(
        owner_id=test_user.id, telegram_id=99, username="inactive",
        first_name="I", token="0:0", status=BotStatus.INACTIVE,
    ))
    await db.commit()

    active, _ = await ListBots(db).execute(owner_id=test_user.id, status=BotStatus.ACTIVE)
    assert len(active) == 1
    assert active[0].status == BotStatus.ACTIVE


@pytest.mark.asyncio
async def test_get_bot_filters_by_owner(db, test_user, test_bot):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    assert await get_bot(db, test_bot.id, owner_id=other.id) is None
    assert await get_bot(db, test_bot.id, owner_id=test_user.id) is not None


@pytest.mark.asyncio
async def test_find_or_404_raises(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await find_bot_or_404(db, 12345, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_by_telegram_id(db, test_bot):
    found = await get_bot_by_telegram_id(db, test_bot.telegram_id)
    assert found is not None
    assert found.id == test_bot.id
