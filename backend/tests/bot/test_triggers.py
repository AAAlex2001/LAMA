"""Тесты CRUD триггеров и lookup-хелперов."""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.bots import Trigger, TriggerActionType, TriggerChatType, TriggerType
from backend.services.bot.features.triggers.crud.create_trigger import CreateTrigger
from backend.services.bot.features.triggers.crud.delete_trigger import DeleteTrigger
from backend.services.bot.features.triggers.crud.list_triggers import ListTriggers
from backend.services.bot.features.triggers.crud.update_trigger import UpdateTrigger
from backend.services.bot.features.triggers.lookup import (
    ensure_bot_exists,
    find_trigger_or_404,
)


@pytest.mark.asyncio
async def test_create_trigger(db, test_user, test_bot):
    trigger = await CreateTrigger(db).execute(
        bot_id=test_bot.id,
        name="Welcome new member",
        trigger_type=TriggerType.NEW_MEMBER,
        action_type=TriggerActionType.SEND_MESSAGE,
        action_data={"text": "Привет!"},
        owner_id=test_user.id,
    )
    await db.commit()

    assert trigger.id is not None
    assert trigger.name == "Welcome new member"
    assert trigger.trigger_type == TriggerType.NEW_MEMBER
    assert trigger.action_data == {"text": "Привет!"}


@pytest.mark.asyncio
async def test_create_404_for_foreign_bot(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await CreateTrigger(db).execute(
            bot_id=99999,
            name="X",
            trigger_type=TriggerType.NEW_MEMBER,
            action_type=TriggerActionType.SEND_MESSAGE,
            owner_id=test_user.id,
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_partial(db, test_user, test_bot):
    trigger = await CreateTrigger(db).execute(
        bot_id=test_bot.id, name="Old",
        trigger_type=TriggerType.NEW_MEMBER,
        action_type=TriggerActionType.SEND_MESSAGE,
        action_data={"text": "v1"},
        owner_id=test_user.id,
    )
    await db.commit()

    updated = await UpdateTrigger(db).execute(
        trigger_id=trigger.id,
        owner_id=test_user.id, bot_id=test_bot.id,
        name="New", action_data={"text": "v2"},
    )
    await db.commit()
    assert updated.name == "New"
    assert updated.action_data == {"text": "v2"}


@pytest.mark.asyncio
async def test_list_filters_by_type(db, test_user, test_bot):
    await CreateTrigger(db).execute(
        bot_id=test_bot.id, name="a",
        trigger_type=TriggerType.NEW_MEMBER,
        action_type=TriggerActionType.SEND_MESSAGE,
        owner_id=test_user.id,
    )
    await CreateTrigger(db).execute(
        bot_id=test_bot.id, name="b",
        trigger_type=TriggerType.MESSAGE_TEXT,
        action_type=TriggerActionType.SEND_MESSAGE,
        owner_id=test_user.id,
    )
    await db.commit()

    items, total = await ListTriggers(db).execute(
        bot_id=test_bot.id,
        trigger_type=TriggerType.NEW_MEMBER,
        owner_id=test_user.id,
    )
    assert total == 1
    assert items[0].trigger_type == TriggerType.NEW_MEMBER


@pytest.mark.asyncio
async def test_list_filter_is_active(db, test_user, test_bot):
    await CreateTrigger(db).execute(
        bot_id=test_bot.id, name="on",
        trigger_type=TriggerType.NEW_MEMBER,
        action_type=TriggerActionType.SEND_MESSAGE,
        is_active=True, owner_id=test_user.id,
    )
    await CreateTrigger(db).execute(
        bot_id=test_bot.id, name="off",
        trigger_type=TriggerType.NEW_MEMBER,
        action_type=TriggerActionType.SEND_MESSAGE,
        is_active=False, owner_id=test_user.id,
    )
    await db.commit()

    items, total = await ListTriggers(db).execute(
        bot_id=test_bot.id, is_active=True, owner_id=test_user.id,
    )
    assert total == 1
    assert items[0].is_active is True


@pytest.mark.asyncio
async def test_delete_trigger(db, test_user, test_bot):
    trigger = await CreateTrigger(db).execute(
        bot_id=test_bot.id, name="bye",
        trigger_type=TriggerType.NEW_MEMBER,
        action_type=TriggerActionType.SEND_MESSAGE,
        owner_id=test_user.id,
    )
    await db.commit()
    tid = trigger.id

    await DeleteTrigger(db).execute(tid, owner_id=test_user.id, bot_id=test_bot.id)
    await db.commit()
    remaining = (await db.execute(
        select(Trigger).where(Trigger.id == tid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_find_or_404(db, test_user, test_bot):
    with pytest.raises(HTTPException) as exc:
        await find_trigger_or_404(db, 99999, owner_id=test_user.id, bot_id=test_bot.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_ensure_bot_exists_owner_isolation(db, test_user, test_bot):
    from backend.models.auth import User, UserRole

    other = User(role=UserRole.USER, is_active=True, agree_personal_data=True, agree_terms=True)
    db.add(other)
    await db.commit()
    await db.refresh(other)

    with pytest.raises(HTTPException) as exc:
        await ensure_bot_exists(db, test_bot.id, owner_id=other.id)
    assert exc.value.status_code == 404

    await ensure_bot_exists(db, test_bot.id, owner_id=test_user.id)
