from aiogram.types import Update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.webhook.features.bot_context.get_bot_by_chat import GetBotByChat
from backend.services.webhook.features.bot_context.get_bot_by_token import GetBotByToken
from backend.services.webhook.features.dispatch.get_update_chat_id import GetUpdateChatId


class ResolveBotContext:
    """Сначала ищет бота по чату, потом fallback на токен из URL."""

    async def execute(
        self,
        db: AsyncSession,
        update: Update,
        bot_token: str | None,
    ) -> BotModel | None:
        chat_id = GetUpdateChatId().execute(update)
        if chat_id:
            bot_model = await GetBotByChat().execute(db, chat_id)
            if bot_model:
                return bot_model if self.token_matches(bot_model, bot_token) else None

        if bot_token:
            return await GetBotByToken().execute(db, bot_token)

        return None

    @staticmethod
    def token_matches(bot_model: BotModel, bot_token: str | None) -> bool:
        return not bot_token or bot_model.token == bot_token
