import logging

from aiogram.exceptions import TelegramAPIError
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.callbacks.answer_callback import AnswerCallback
from backend.services.webhook.features.callbacks.commands.get_command_button import (
    GetCommandButton,
)
from backend.services.webhook.features.callbacks.commands.track_button_click import (
    TrackButtonClick,
)
from backend.services.webhook.features.callbacks.get_callback_button_target import (
    GetCallbackButtonTarget,
)

logger = logging.getLogger(__name__)


class ExecuteCallbackAction:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, callback_query: CallbackQuery) -> None:
        target = GetCallbackButtonTarget().execute(callback_query.data)
        user_id = callback_query.from_user.id if callback_query.from_user else None
        if not target or not user_id:
            return

        button = await GetCommandButton(self.db).execute(target.entity_id, target.button_id)
        if not button:
            return

        tracker = TrackButtonClick(self.db)
        await tracker.execute(target.entity_id, target.button_id, user_id)
        bot = resolve_by_token(self.bot_model.token)
        try:
            if button.callback_action == "send_dm":
                await self.send_dm(bot, callback_query, user_id, button.callback_response)
                return
            if button.callback_action == "reply_in_chat":
                text = button.callback_response or "Готово."
                await AnswerCallback().execute(bot, callback_query.id, text, bool(button.callback_response))
                return
            if button.callback_action == "track_click":
                count = await tracker.get_count(target.entity_id, target.button_id)
                await AnswerCallback().execute(bot, callback_query.id, f"Кликов: {count}")
                return
            await AnswerCallback().execute(bot, callback_query.id, "Готово.")
        except TelegramAPIError as exc:
            logger.warning("command callback failed: %s", exc)
            await AnswerCallback().execute(bot, callback_query.id, "Не удалось выполнить.", True)

    async def send_dm(
        self,
        bot,
        callback_query: CallbackQuery,
        user_id: int,
        response_text: str | None,
    ) -> None:
        if not response_text:
            await AnswerCallback().execute(bot, callback_query.id, "Готово.")
            return
        try:
            await bot.send_message(chat_id=user_id, text=response_text)
            await AnswerCallback().execute(bot, callback_query.id, "Готово.")
        except TelegramAPIError as exc:
            logger.warning("Failed to send DM to %s: %s", user_id, exc)
            await AnswerCallback().execute(
                bot,
                callback_query.id,
                "Не удалось отправить. Начните диалог с ботом.",
                True,
            )
