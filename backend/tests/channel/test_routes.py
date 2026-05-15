"""Интеграционные тесты роутов /api/channels/* через httpx.AsyncClient."""

import pytest
from sqlalchemy import select

from backend.models.channels import (
    ActionType,
    BackupMode,
    ChannelGroup,
    ChannelModerationRule,
    ChannelType,
)


@pytest.mark.asyncio
async def test_create_returns_201(client):
    payload = {
        "telegram_id": -1009998,
        "channel_type": "CHANNEL",
        "title": "Created via API",
    }
    response = await client.post("/api/channels/", json=payload)
    assert response.status_code == 201
    assert response.json()["title"] == "Created via API"


@pytest.mark.asyncio
async def test_list_returns_paged(client, test_user, db):
    for i in range(3):
        db.add(ChannelGroup(
            owner_id=test_user.id, telegram_id=-1000 - i,
            channel_type=ChannelType.CHANNEL, title=f"ch{i}",
        ))
    await db.commit()

    response = await client.get("/api/channels/", params={"page": 1, "page_size": 2})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


@pytest.mark.asyncio
async def test_get_channel_by_id(client, test_channel):
    response = await client.get(f"/api/channels/{test_channel.id}")
    assert response.status_code == 200
    assert response.json()["id"] == test_channel.id


@pytest.mark.asyncio
async def test_get_unknown_returns_404(client):
    response = await client.get("/api/channels/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_channel(client, test_channel):
    response = await client.put(
        f"/api/channels/{test_channel.id}",
        json={"title": "Renamed via API"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Renamed via API"


@pytest.mark.asyncio
async def test_delete_channel(client, session_factory, test_channel):
    cid = test_channel.id
    response = await client.delete(f"/api/channels/{cid}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    async with session_factory() as fresh:
        remaining = (await fresh.execute(
            select(ChannelGroup).where(ChannelGroup.id == cid)
        )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_moderation_create_and_list(client, test_channel):
    create = await client.post(
        f"/api/channels/{test_channel.id}/moderation/rules",
        json={"phrase": "spam", "action": "DELETE"},
    )
    assert create.status_code == 201

    listing = await client.get(f"/api/channels/{test_channel.id}/moderation/rules")
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert len(items) == 1
    assert items[0]["phrase"] == "spam"


@pytest.mark.asyncio
async def test_moderation_delete(client, db, test_channel):
    rule = ChannelModerationRule(
        channel_id=test_channel.id, phrase="x", action=ActionType.DELETE,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    response = await client.delete(
        f"/api/channels/{test_channel.id}/moderation/rules/{rule.id}",
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_antispam_get_and_update(client, test_channel):
    get_response = await client.get(f"/api/channels/{test_channel.id}/antispam")
    assert get_response.status_code == 200

    update = await client.put(
        f"/api/channels/{test_channel.id}/antispam",
        json={"link_filter_mode": "BLOCK_ALL"},
    )
    assert update.status_code == 200
    assert update.json()["link_filter_mode"] == "BLOCK_ALL"


@pytest.mark.asyncio
async def test_banned_words_toggle(client, test_channel):
    get_response = await client.get(
        f"/api/channels/{test_channel.id}/banned-words/toggle",
    )
    assert get_response.status_code == 200
    assert get_response.json()["banned_words_enabled"] is False

    toggle = await client.put(
        f"/api/channels/{test_channel.id}/banned-words/toggle",
        json={"enabled": True},
    )
    assert toggle.status_code == 200
    assert toggle.json()["banned_words_enabled"] is True


@pytest.mark.asyncio
async def test_backup_mode_update_via_api(client, test_user, db, test_channel):
    response = await client.post(
        f"/api/channels/{test_channel.id}/backup-mode",
        json={"backup_mode": "ENABLED"},
    )
    assert response.status_code == 200
    assert response.json()["backup_mode"] == "ENABLED"


@pytest.mark.asyncio
async def test_backup_stats_empty(client, test_channel):
    response = await client.get(f"/api/channels/{test_channel.id}/stats")
    assert response.status_code == 200
    assert response.json()["total_backed_up_posts"] == 0
