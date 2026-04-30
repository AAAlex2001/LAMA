import logging
import os

import aiohttp
from aiogram.types import Message

from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


class SendGuestLink:
    async def execute(self, message: Message, bot_token: str | None) -> None:
        if not message.from_user or not bot_token:
            return

        bot = resolve_by_token(bot_token)
        try:
            access_token = await self.get_guest_token(message)
            create_post_link = self.get_create_post_link(access_token)
            await bot.send_message(
                chat_id=message.chat.id,
                text=self.get_response_text(message, create_post_link),
                parse_mode="HTML",
                disable_web_page_preview=True,
                reply_to_message_id=message.message_id,
            )
        except Exception as exc:
            logger.error("Guest command error: %s", exc, exc_info=True)
            await bot.send_message(
                chat_id=message.chat.id,
                text="Ошибка при создании ссылки. Попробуйте позже.",
                reply_to_message_id=message.message_id,
            )

    async def get_guest_token(self, message: Message) -> str:
        api_base_url = os.getenv("API_BASE_URL", "http://localhost:8000/api")
        user = message.from_user
        payload = {
            "telegram_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{api_base_url}/auth/bot-guest-token",
                json=payload,
            ) as response:
                if response.status != 200:
                    response_text = await response.text()
                    raise RuntimeError(
                        f"API returned {response.status}: {response_text}"
                    )
                data = await response.json()

        access_token = data.get("access_token")
        if not access_token:
            raise RuntimeError("No access token in response")
        return access_token

    @staticmethod
    def get_create_post_link(access_token: str) -> str:
        frontend_url = os.getenv("FRONTEND_URL", "https://lamaplanner.com")
        return f"{frontend_url}/ru/create-post?token={access_token}"

    @staticmethod
    def get_response_text(message: Message, create_post_link: str) -> str:
        first_name = message.from_user.first_name if message.from_user else "user"
        return (
            f"<b>Привет, {first_name}!</b>\n\n"
            "Создайте пост через веб-интерфейс:\n\n"
            f"{create_post_link}\n\n"
            "Ссылка действительна 24 часа."
        )
