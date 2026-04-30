import logging

from aiogram.exceptions import TelegramAPIError

from backend.services.bot_provider import evict_bot, resolve_by_token

logger = logging.getLogger(__name__)


class DeleteWebhook:
    async def execute(self, token: str, evict_cache: bool = True) -> None:
        try:
            bot = resolve_by_token(token).bot
            await bot.delete_webhook(drop_pending_updates=True)
        except TelegramAPIError as exc:
            logger.warning("Failed to remove webhook: %s", exc)

        if evict_cache:
            await evict_bot(token)
