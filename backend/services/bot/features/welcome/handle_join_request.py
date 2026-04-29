"""Welcome для ChatJoinRequest — шлётся в ЛС."""

from typing import Optional

from aiogram.types import ChatJoinRequest, Message
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.welcome.send_welcome import SendWelcome
from backend.services.telegram_client import RateLimitedBot


class WelcomeJoinRequest:
    """Собирает контекст из join_request.from_user/chat и зовёт SendWelcome в ЛС."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        telegram_bot: RateLimitedBot,
        bot_model: BotModel,
        join_request: ChatJoinRequest,
    ) -> Optional[Message]:
        if not bot_model.welcome_enabled:
            raise HTTPException(status_code=404, detail="Bot not found")

        user = join_request.from_user
        context = {
            "user": {
                "id": user.id,
                "first_name": user.first_name or "",
                "username": user.username,
                "last_name": getattr(user, "last_name", None) or "",
            },
            "bot": {"first_name": bot_model.first_name or ""},
            "chat": {"title": (join_request.chat.title if join_request.chat else "") or ""},
        }
        return await SendWelcome(self.db).execute(
            telegram_bot, bot_model,
            user_id=user.id, chat_id=user.id, context=context,
        )
