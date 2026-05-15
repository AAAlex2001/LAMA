"""Интеграционные тесты роутов /api/bots/* через httpx.AsyncClient."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from backend.models.bots import Bot, BotCommand, BotStatus


def fake_bot_info(telegram_id=987654321, username="mocked_bot", first_name="Mocked"):
    return SimpleNamespace(id=telegram_id, username=username, first_name=first_name)


@pytest.mark.asyncio
async def test_create_bot_returns_201(client, monkeypatch):
    monkeypatch.setattr(
        "backend.services.bot.features.crud.create_bot.fetch_bot_info",
        AsyncMock(return_value=(fake_bot_info(), None, None)),
    )

    response = await client.post("/api/bots/", json={"token": "999:fake_token_for_test"})
    assert response.status_code == 201
    assert response.json()["telegram_id"] == 987654321


@pytest.mark.asyncio
async def test_list_bots(client, test_bot):
    response = await client.get("/api/bots/")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == test_bot.id


@pytest.mark.asyncio
async def test_get_bot_by_id(client, test_bot):
    response = await client.get(f"/api/bots/{test_bot.id}")
    assert response.status_code == 200
    assert response.json()["id"] == test_bot.id


@pytest.mark.asyncio
async def test_get_unknown_returns_404(client):
    response = await client.get("/api/bots/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_deactivate_then_activate(client, test_bot):
    deact = await client.post(f"/api/bots/{test_bot.id}/deactivate")
    assert deact.status_code == 200
    assert deact.json()["status"] == "INACTIVE"

    act = await client.post(f"/api/bots/{test_bot.id}/activate")
    assert act.status_code == 200
    assert act.json()["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_delete_bot(client, session_factory, test_bot):
    bid = test_bot.id
    response = await client.delete(f"/api/bots/{bid}")
    assert response.status_code == 204

    async with session_factory() as fresh:
        remaining = (await fresh.execute(
            select(Bot).where(Bot.id == bid)
        )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_commands_create_and_list(client, test_bot):
    create = await client.post(
        f"/api/bots/{test_bot.id}/commands",
        json={
            "command": "/help",
            "response_text": "Доступные команды: /help",
            "is_active": True,
        },
    )
    assert create.status_code == 201

    listing = await client.get(f"/api/bots/{test_bot.id}/commands")
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert len(items) == 1
    assert items[0]["command"] == "/help"


@pytest.mark.asyncio
async def test_command_delete(client, db, test_bot):
    cmd = BotCommand(
        bot_id=test_bot.id, command="/bye", response_text="!",
        is_active=True,
    )
    db.add(cmd)
    await db.commit()
    await db.refresh(cmd)

    response = await client.delete(f"/api/bots/{test_bot.id}/commands/{cmd.id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_triggers_create_and_list(client, test_bot):
    create = await client.post(
        f"/api/bots/{test_bot.id}/triggers",
        json={
            "name": "Привет новенькому",
            "trigger_type": "MEMBER_JOINED",
            "action_type": "SEND_MESSAGE",
            "action_data": {"text": "Welcome"},
        },
    )
    assert create.status_code == 201

    listing = await client.get(f"/api/bots/{test_bot.id}/triggers")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_recurring_create_and_list(client, test_bot):
    create = await client.post(
        f"/api/bots/{test_bot.id}/recurring",
        json={
            "name": "Daily morning",
            "text_content": "Доброе утро",
            "target_chats": [111],
            "interval_type": "DAILY",
            "time_points": ["09:00"],
            "timezone": "UTC",
        },
    )
    assert create.status_code == 200

    listing = await client.get(f"/api/bots/{test_bot.id}/recurring")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_auto_replies_create_and_list(client, test_bot):
    create = await client.post(
        f"/api/bots/{test_bot.id}/auto-replies",
        json={
            "keywords": ["hi", "привет"],
            "response_text": "Здравствуйте!",
            "is_active": True,
        },
    )
    assert create.status_code == 201

    listing = await client.get(f"/api/bots/{test_bot.id}/auto-replies")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_welcome_get_and_update(client, test_bot):
    get_resp = await client.get(f"/api/bots/{test_bot.id}/welcome")
    assert get_resp.status_code == 200

    update = await client.put(
        f"/api/bots/{test_bot.id}/welcome",
        json={"welcome_enabled": True, "welcome_message": "Привет!"},
    )
    assert update.status_code == 200
    assert update.json()["welcome_enabled"] is True


@pytest.mark.asyncio
async def test_auto_approval_get(client, test_bot):
    response = await client.get(f"/api/bots/{test_bot.id}/auto-approval")
    assert response.status_code == 200
    body = response.json()
    assert "auto_approval_mode" in body
