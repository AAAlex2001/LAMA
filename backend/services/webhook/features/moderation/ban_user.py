import asyncio

from aiogram.types import Message

from backend.services.webhook.types import TELEGRAM_API_TIMEOUT


class BanUser:
    async def execute(self, bot, message: Message) -> None:
        if not message.from_user:
            return
        await asyncio.wait_for(
            bot.ban_chat_member(
                chat_id=message.chat.id,
                user_id=message.from_user.id,
            ),
            timeout=TELEGRAM_API_TIMEOUT,
        )
