"""Welcome при добавлении участника в группу."""

from typing import Optional

from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.welcome.send_welcome import SendWelcome
from backend.services.telegram_client import RateLimitedBot


class WelcomeMemberJoined:
    """Шлёт приветствие в чат группы (chat_id) на основе данных нового участника."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        telegram_bot: RateLimitedBot,
        bot_model: BotModel,
        user_id: int,
        chat_id: int,
        user_first_name: Optional[str] = None,
        user_username: Optional[str] = None,
        user_last_name: Optional[str] = None,
        chat_title: Optional[str] = None,
        message_thread_id: Optional[int] = None,
    ) -> Optional[Message]:
        if not bot_model.welcome_enabled:
            raise HTTPException(status_code=404, detail="Bot not found")

        context = {
            "user": {
                "id": user_id,
                "first_name": user_first_name or "",
                "username": user_username,
                "last_name": user_last_name or "",
            },
            "bot": {"first_name": bot_model.first_name or ""},
            "chat": {"title": chat_title or ""},
        }
        return await SendWelcome(self.db).execute(
            telegram_bot, bot_model,
            user_id=user_id, chat_id=chat_id, context=context,
            message_thread_id=message_thread_id,
        )
