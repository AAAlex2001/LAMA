"""Streaming-редактирование текста поста через DeepSeek."""

import json
from typing import AsyncIterator

from fastapi import HTTPException

from backend.services.publications.features.ai._http import (
    DEEPSEEK_MODEL,
    DEEPSEEK_URL,
    http_client,
)
from backend.services.publications.features.ai.edit_content import build_edit_messages


class EditContentStream:
    """То же что EditContent, но yield-ит чанки текста по мере прихода."""

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    async def execute(
        self, original_text: str, instruction: str,
    ) -> AsyncIterator[str]:
        if not self.api_key:
            raise HTTPException(status_code=503, detail="AI service is not configured")

        async with http_client.stream(
            "POST",
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": build_edit_messages(original_text, instruction),
                "temperature": 0.7,
                "stream": True,
            },
        ) as response:
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="AI service request failed")

            async for line in response.aiter_lines():
                chunk = parse_stream_line(line)
                if chunk == STREAM_DONE:
                    break
                if chunk:
                    yield chunk


STREAM_DONE = object()


def parse_stream_line(line: str):
    """Разбирает одну SSE-строку: возвращает текст-чанк, STREAM_DONE или None."""
    if not line.startswith("data: "):
        return None
    data = line[6:]
    if data == "[DONE]":
        return STREAM_DONE
    try:
        return json.loads(data)["choices"][0]["delta"].get("content")
    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
        return None
