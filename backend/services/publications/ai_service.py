from typing import Optional
import httpx

from backend.schemas.publications import AIGenerateRequest


class AIService:
    """Сервис для работы с AI (DeepSeek API)"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.http_client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
        )

    async def generate_content(self, request: AIGenerateRequest) -> str:
        """Сгенерировать контент с помощью AI"""
        if not self.api_key:
            raise ValueError("AI API key not configured")

        response = await self.http_client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": f"You are a professional content creator for Telegram channels. Create content in {request.tone} tone. Maximum length: {request.max_length} characters. Write in Russian language."
                    },
                    {
                        "role": "user",
                        "content": request.prompt
                    }
                ],
                "max_tokens": request.max_length,
                "temperature": 0.7
            }
        )

        if response.status_code != 200:
            raise ValueError(f"DeepSeek API error: {response.text}")

        result = response.json()
        return result['choices'][0]['message']['content']

    async def edit_content(self, original_text: str, instruction: str) -> str:
        """Редактировать контент с помощью AI"""
        if not self.api_key:
            raise ValueError("AI API key not configured")

        response = await self.http_client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional content editor for Telegram channels. Edit the content according to the instruction. Write in Russian language."
                    },
                    {
                        "role": "user",
                        "content": f"Original text: {original_text}\n\nInstruction: {instruction}\n\nProvide only the edited text."
                    }
                ],
                "temperature": 0.7
            }
        )

        if response.status_code != 200:
            raise ValueError(f"DeepSeek API error: {response.text}")

        result = response.json()
        return result['choices'][0]['message']['content']

    async def edit_content_stream(self, original_text: str, instruction: str):
        """Редактировать контент с помощью AI со streaming"""
        if not self.api_key:
            raise ValueError("AI API key not configured")

        async with self.http_client.stream(
            "POST",
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional content editor for Telegram channels. Edit the content according to the instruction. Write in Russian language."
                    },
                    {
                        "role": "user",
                        "content": f"Original text: {original_text}\n\nInstruction: {instruction}\n\nProvide only the edited text."
                    }
                ],
                "temperature": 0.7,
                "stream": True
            }
        ) as response:
            if response.status_code != 200:
                raise ValueError(f"DeepSeek API error: {await response.aread()}")
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data)
                        if chunk['choices'][0]['delta'].get('content'):
                            yield chunk['choices'][0]['delta']['content']
                    except:
                        continue
