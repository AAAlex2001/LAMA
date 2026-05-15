from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.callbacks.answer_callback import AnswerCallback
from backend.services.webhook.features.callbacks.check_subscriber import CheckSubscriber
from backend.services.webhook.features.callbacks.commands.get_command_button import (
    GetCommandButton,
)
from backend.services.webhook.features.callbacks.get_callback_button_target import (
    GetCallbackButtonTarget,
)


class ShowHiddenText:
    """Раскрывает скрытый блок при клике (subscribed/unsubscribed-варианты)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, callback_query: CallbackQuery) -> None:
        target = GetCallbackButtonTarget().execute(callback_query.data)
        user_id = callback_query.from_user.id if callback_query.from_user else None
        chat_id = callback_query.message.chat.id if callback_query.message else None
        if not target or not user_id or not chat_id:
            return

        button = await GetCommandButton(self.db).execute(target.entity_id, target.button_id)
        if not button:
            return

        bot = resolve_by_token(self.bot_model.token)
        is_subscriber = await CheckSubscriber().execute(bot, chat_id, user_id)
        text = (
            button.hidden_text_subscribed
            if is_subscriber
            else button.hidden_text_unsubscribed
        )
        if text:
            await AnswerCallback().execute(bot, callback_query.id, text, True)
