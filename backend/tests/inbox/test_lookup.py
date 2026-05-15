"""Тесты find_event_or_404 + mark_payload_handled."""

import pytest
from fastapi import HTTPException

from backend.services.inbox.features.lookup import find_event_or_404, mark_payload_handled
from backend.tests.inbox.conftest import add_event


@pytest.mark.asyncio
async def test_find_event_returns_event(db, test_user):
    event = await add_event(db, test_user.id)
    found = await find_event_or_404(db, event.id, test_user.id)
    assert found.id == event.id


@pytest.mark.asyncio
async def test_find_event_404_when_owner_mismatch(db, test_user):
    event = await add_event(db, test_user.id)
    with pytest.raises(HTTPException) as exc:
        await find_event_or_404(db, event.id, owner_id=9999)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_event_404_when_unknown_id(db, test_user):
    with pytest.raises(HTTPException) as exc:
        await find_event_or_404(db, event_id=99999, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_mark_payload_handled_sets_true(db, test_user):
    event = await add_event(db, test_user.id, payload={"handled": False, "extra": "x"})
    mark_payload_handled(event)
    assert event.payload["handled"] is True
    assert event.payload["extra"] == "x"


@pytest.mark.asyncio
async def test_mark_payload_handled_noop_without_key(db, test_user):
    """Если ключа `handled` нет — не добавляем."""
    event = await add_event(db, test_user.id, payload={"other": 1})
    before = dict(event.payload)
    mark_payload_handled(event)
    assert event.payload == before


@pytest.mark.asyncio
async def test_mark_payload_handled_noop_for_empty_payload(db, test_user):
    event = await add_event(db, test_user.id, payload={})
    mark_payload_handled(event)
    assert event.payload == {}
