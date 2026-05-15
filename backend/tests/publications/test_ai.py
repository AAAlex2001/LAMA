"""Тесты AI-фич: GenerateContent / EditContent. HTTP к DeepSeek мокается."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.schemas.publications.ai import AIGenerateRequest
from backend.schemas.publications.enums import ContentType
from backend.services.publications.features.ai.edit_content import EditContent
from backend.services.publications.features.ai.generate_content import GenerateContent


def fake_response(status_code=200, content="result"):
    return SimpleNamespace(
        status_code=status_code,
        json=lambda: {"choices": [{"message": {"content": content}}]},
    )


@pytest.mark.asyncio
async def test_generate_returns_content(monkeypatch):
    monkeypatch.setattr(
        "backend.services.publications.features.ai.generate_content.http_client.post",
        AsyncMock(return_value=fake_response(200, "Привет")),
    )

    request = AIGenerateRequest(
        prompt="Напиши пост",
        content_type=ContentType.TEXT,
        tone="friendly",
        max_length=500,
    )
    result = await GenerateContent("fake-key").execute(request)
    assert result == "Привет"


@pytest.mark.asyncio
async def test_generate_without_api_key_503(monkeypatch):
    request = AIGenerateRequest(
        prompt="напиши краткий пост", content_type=ContentType.TEXT, tone="neutral", max_length=200,
    )
    with pytest.raises(HTTPException) as exc:
        await GenerateContent(None).execute(request)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_generate_502_when_upstream_fails(monkeypatch):
    monkeypatch.setattr(
        "backend.services.publications.features.ai.generate_content.http_client.post",
        AsyncMock(return_value=fake_response(500, "")),
    )

    request = AIGenerateRequest(
        prompt="напиши краткий пост", content_type=ContentType.TEXT, tone="neutral", max_length=200,
    )
    with pytest.raises(HTTPException) as exc:
        await GenerateContent("fake-key").execute(request)
    assert exc.value.status_code == 502


@pytest.mark.asyncio
async def test_generate_502_on_malformed_response(monkeypatch):
    bad = SimpleNamespace(status_code=200, json=lambda: {"unexpected": "shape"})
    monkeypatch.setattr(
        "backend.services.publications.features.ai.generate_content.http_client.post",
        AsyncMock(return_value=bad),
    )

    request = AIGenerateRequest(
        prompt="напиши краткий пост", content_type=ContentType.TEXT, tone="neutral", max_length=200,
    )
    with pytest.raises(HTTPException) as exc:
        await GenerateContent("fake-key").execute(request)
    assert exc.value.status_code == 502


@pytest.mark.asyncio
async def test_edit_returns_edited_text(monkeypatch):
    monkeypatch.setattr(
        "backend.services.publications.features.ai.edit_content.http_client.post",
        AsyncMock(return_value=fake_response(200, "edited")),
    )

    result = await EditContent("fake-key").execute("original", "make it shorter")
    assert result == "edited"


@pytest.mark.asyncio
async def test_edit_without_api_key_503():
    with pytest.raises(HTTPException) as exc:
        await EditContent(None).execute("x", "y")
    assert exc.value.status_code == 503
