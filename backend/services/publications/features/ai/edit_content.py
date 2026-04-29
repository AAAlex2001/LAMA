"""Редактирование текста поста по инструкции через DeepSeek (non-streaming)."""

from fastapi import HTTPException

from backend.services.publications.features.ai._http import (
    DEEPSEEK_MODEL,
    DEEPSEEK_URL,
    http_client,
)

EDIT_SYSTEM_PROMPT = (
    "You are a professional content editor for Telegram channels. "
    "Edit the content according to the instruction. Write in Russian language."
)


class EditContent:
    """Один запрос к DeepSeek для редактирования; возвращает отредактированный текст."""

    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    async def execute(self, original_text: str, instruction: str) -> str:
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
                "messages": build_edit_messages(original_text, instruction),
                "temperature": 0.7,
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="AI service request failed")

        try:
            return response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise HTTPException(status_code=502, detail="AI service returned unexpected response")


def build_edit_messages(original_text: str, instruction: str) -> list[dict]:
    """Формирует system/user сообщения для редактирования."""
    return [
        {"role": "system", "content": EDIT_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Original text: {original_text}\n\n"
                f"Instruction: {instruction}\n\n"
                f"Provide only the edited text."
            ),
        },
    ]
