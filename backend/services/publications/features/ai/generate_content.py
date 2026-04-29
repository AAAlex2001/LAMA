"""Генерация поста по промпту через DeepSeek (non-streaming)."""

from fastapi import HTTPException

from backend.schemas.publications.ai import AIGenerateRequest
from backend.services.publications.features.ai._http import (
    DEEPSEEK_MODEL,
    DEEPSEEK_URL,
    http_client,
)


class GenerateContent:
    """Один запрос к DeepSeek; возвращает сгенерированный текст."""

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    async def execute(self, request: AIGenerateRequest) -> str:
        if not self.api_key:
            raise HTTPException(status_code=503, detail="AI service is not configured")

        response = await http_client.post(
            DEEPSEEK_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": build_system_prompt(request)},
                    {"role": "user", "content": request.prompt},
                ],
                "max_tokens": request.max_length,
                "temperature": 0.7,
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="AI service request failed")

        return extract_content(response.json())


def build_system_prompt(request: AIGenerateRequest) -> str:
    """System-промпт для генерации Telegram-контента в нужном тоне."""
    return (
        f"You are a professional content creator for Telegram channels. "
        f"Create content in {request.tone} tone. "
        f"Maximum length: {request.max_length} characters. "
        f"Write in Russian language."
    )


def extract_content(payload: dict) -> str:
    """Достаёт choices[0].message.content; иначе 502."""
    try:
        return payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="AI service returned unexpected response")
