import logging

from aiogram.exceptions import TelegramAPIError

logger = logging.getLogger(__name__)


class AnswerCallback:
    """answer_callback_query с автоглушением ошибки 'query too old'."""

    async def execute(
        self,
        bot,
        callback_id: str,
        text: str,
        show_alert: bool = False,
    ) -> None:
        try:
            await bot.answer_callback_query(
                callback_id,
                text=text,
                show_alert=show_alert,
            )
        except TelegramAPIError as exc:
            if "query is too old" not in str(exc):
                logger.warning("Failed to answer callback: %s", exc)
