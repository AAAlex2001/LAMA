"""Тесты CRUD команд бота + поиск по тексту с channel-priority."""

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.bots import BotCommand, MessageType
from backend.schemas.bots.commands import BotCommandCreate, BotCommandUpdate
from backend.services.bot.features.commands.create_command import CreateCommand
from backend.services.bot.features.commands.delete_command import DeleteCommand
from backend.services.bot.features.commands.find_by_text import FindCommandByText
from backend.services.bot.features.commands.list_commands import ListCommands
from backend.services.bot.features.commands.lookup import find_command_or_404
from backend.services.bot.features.commands.update_command import UpdateCommand


@pytest.mark.asyncio
async def test_create_message_command(db, test_user, test_bot):
    payload = BotCommandCreate(
        command="/hello",
        description="Greet",
        response_text="Hi!",
    )
    cmd = await CreateCommand(db).execute(test_bot.id, payload, owner_id=test_user.id)
    await db.commit()

    assert cmd.id is not None
    assert cmd.command == "/hello"
    assert cmd.response_text == "Hi!"


@pytest.mark.asyncio
async def test_create_404_for_foreign_bot(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await CreateCommand(db).execute(
            99999, BotCommandCreate(command="/x", response_text="!"),
            owner_id=test_user.id,
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_list_returns_all_bot_commands(db, test_user, test_bot):
    for cmd in ["/a", "/b", "/c"]:
        await CreateCommand(db).execute(
            test_bot.id, BotCommandCreate(command=cmd, response_text="ok"),
            owner_id=test_user.id,
        )
    await db.commit()

    items, total = await ListCommands(db).execute(test_bot.id, owner_id=test_user.id)
    assert total == 3
    assert sorted(c.command for c in items) == ["/a", "/b", "/c"]


@pytest.mark.asyncio
async def test_list_filter_is_active(db, test_user, test_bot):
    await CreateCommand(db).execute(
        test_bot.id,
        BotCommandCreate(command="/on", response_text="!", is_active=True),
        owner_id=test_user.id,
    )
    await CreateCommand(db).execute(
        test_bot.id,
        BotCommandCreate(command="/off", response_text="!", is_active=False),
        owner_id=test_user.id,
    )
    await db.commit()

    items, total = await ListCommands(db).execute(
        test_bot.id, is_active=True, owner_id=test_user.id,
    )
    assert total == 1
    assert items[0].command == "/on"


@pytest.mark.asyncio
async def test_update_command(db, test_user, test_bot):
    cmd = await CreateCommand(db).execute(
        test_bot.id, BotCommandCreate(command="/h", response_text="old"),
        owner_id=test_user.id,
    )
    await db.commit()

    updated = await UpdateCommand(db).execute(
        cmd.id, BotCommandUpdate(response_text="new"),
        owner_id=test_user.id, bot_id=test_bot.id,
    )
    await db.commit()
    assert updated.response_text == "new"


@pytest.mark.asyncio
async def test_delete_command(db, test_user, test_bot):
    cmd = await CreateCommand(db).execute(
        test_bot.id, BotCommandCreate(command="/del", response_text="bye"),
        owner_id=test_user.id,
    )
    await db.commit()
    cid = cmd.id

    await DeleteCommand(db).execute(cid, owner_id=test_user.id, bot_id=test_bot.id)
    await db.commit()
    remaining = (await db.execute(
        select(BotCommand).where(BotCommand.id == cid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_find_command_or_404(db, test_user, test_bot):
    with pytest.raises(HTTPException) as exc:
        await find_command_or_404(db, 99999, owner_id=test_user.id, bot_id=test_bot.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_by_text_returns_active(db, test_user, test_bot):
    await CreateCommand(db).execute(
        test_bot.id, BotCommandCreate(command="/start", response_text="hello"),
        owner_id=test_user.id,
    )
    await db.commit()

    found = await FindCommandByText(db).execute(test_bot.id, "/start")
    assert found is not None
    assert found.command == "/start"


@pytest.mark.asyncio
async def test_find_by_text_returns_none_for_unknown(db, test_bot):
    found = await FindCommandByText(db).execute(test_bot.id, "/nonexistent")
    assert found is None


@pytest.mark.asyncio
async def test_find_by_text_prefers_channel_specific(db, test_user, test_bot):
    """Channel-specific команда должна выигрывать у generic, если передан channel_id."""
    await CreateCommand(db).execute(
        test_bot.id,
        BotCommandCreate(command="/r", response_text="generic"),
        owner_id=test_user.id,
    )
    await CreateCommand(db).execute(
        test_bot.id,
        BotCommandCreate(command="/r", response_text="ch-specific", channel_id=42),
        owner_id=test_user.id,
    )
    await db.commit()

    found_ch = await FindCommandByText(db).execute(test_bot.id, "/r", channel_id=42)
    assert found_ch.response_text == "ch-specific"

    found_generic = await FindCommandByText(db).execute(test_bot.id, "/r")
    assert found_generic.response_text == "generic"
