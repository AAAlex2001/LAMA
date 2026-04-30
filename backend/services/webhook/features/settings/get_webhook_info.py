import logging

from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)


class GetWebhookInfo:
    async def execute(self, bot):
        try:
            return await bot.get_webhook_info()
        except TelegramAPIError as exc:
            logger.warning("get_webhook_info failed: %s", exc)
            return None
