import asyncio
from typing import Union

from aiogram.exceptions import TelegramBadRequest
from fastapi import HTTPException

from backend.services.telegram_client import RateLimitedBot


class ValidateChatAccess:
    """Проверяет, что бот и пользователь имеют доступ к чату."""

    def __init__(self, bot: RateLimitedBot) -> None:
        self.bot = bot

    async def execute(
        self,
        chat_identifier: Union[int, str],
        bot_telegram_id: int,
        user_telegram_id: int,
    ) -> None:
        """Выбросить HTTPException, если бот или пользователь не имеют доступа."""
        try:
            bot_member, user_member = await asyncio.gather(
                self.bot.get_chat_member(chat_identifier, bot_telegram_id),
                self.bot.get_chat_member(chat_identifier, user_telegram_id),
            )
            if bot_member.status in ("left", "kicked"):
                raise HTTPException(status_code=403, detail="Bot is not a member of this channel/group")
            if user_member.status not in ("administrator", "creator"):
                raise HTTPException(status_code=403, detail="User is not an admin in this channel/group")
            return
        except TelegramBadRequest as exc:
            if "member list is inaccessible" not in str(exc).lower():
                raise

        administrators = await self.bot.get_chat_administrators(chat_identifier)
        admin_ids = {admin.user.id for admin in administrators}
        if bot_telegram_id not in admin_ids:
            raise HTTPException(status_code=403, detail="Bot is not an admin of this channel/group")
        if user_telegram_id not in admin_ids:
            raise HTTPException(status_code=403, detail="User is not an admin in this channel/group")
