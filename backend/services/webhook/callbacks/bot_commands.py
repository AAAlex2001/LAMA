import logging
from typing import Optional

from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select

from backend.models.bots import Bot as BotModel, BotCommand
from backend.services.webhook.callbacks.base import BaseCallbackProcessor
from backend.services.bot_provider import resolve_by_token
from backend.schemas.publications.common import InlineButton

logger = logging.getLogger(__name__)


class BotCommandsCallbackProcessor(BaseCallbackProcessor):
    """Callback processor for bot commands inline buttons."""

    async def process_hidden_text(self, callback_query: CallbackQuery) -> None:
        command_id, button_id = self.parse_callback_data(callback_query.data)
        if command_id is None:
            return

        button = await self.load_button(command_id, button_id)
        if not button:
            return

        text = button.hidden_text_subscribed or button.hidden_text_unsubscribed or "✅"
        bot = resolve_by_token(self.bot_model.token)
        await self.answer_callback(bot, callback_query.id, text, True)

    async def process_callback_action(self, callback_query: CallbackQuery) -> None:
        command_id, button_id = self.parse_callback_data(callback_query.data)
        if command_id is None:
            return

        button = await self.load_button(command_id, button_id)
        if not button:
            return

        action = button.callback_action
        response = button.callback_response or "✅"

        bot = resolve_by_token(self.bot_model.token)
        user_id = callback_query.from_user.id if callback_query.from_user else None

        try:
            if action == "send_dm" and user_id:
                await bot.send_message(chat_id=user_id, text=response)
                await self.answer_callback(bot, callback_query.id, "✅")
                return
            if action == "reply_in_chat":
                await self.answer_callback(bot, callback_query.id, response, bool(button.callback_response))
                return
            if action == "track_click":
                await self.answer_callback(bot, callback_query.id, "✅")
                return

            await self.answer_callback(bot, callback_query.id, "✅")
        except TelegramAPIError as e:
            logger.warning("command_callback_failed: %s", e)
            await self.answer_callback(bot, callback_query.id, "❌ Не удалось выполнить", True)

    def parse_callback_data(self, data: Optional[str]) -> tuple[Optional[int], str]:
        """Parse callback_data format 'prefix:command_id:button_id'."""
        if not data:
            return None, ""
        parts = data.split(":")
        if len(parts) < 3:
            return None, ""
        try:
            command_id = int(parts[1])
        except ValueError:
            return None, ""
        button_id = ":".join(parts[2:])
        return command_id, button_id

    async def load_button(self, command_id: int, button_id: str) -> Optional[InlineButton]:
        """Load a single inline button from BotCommand.response_buttons.

        Efficient: selects only response_buttons column.
        Typed: returns InlineButton Pydantic model.
        """
        result = await self.db.execute(
            select(BotCommand.response_buttons).where(BotCommand.id == command_id)
        )
        kb = result.scalar_one_or_none()
        if not kb:
            return None

        rows = kb.get("buttons", []) if isinstance(kb, dict) else kb
        if not isinstance(rows, list):
            return None

        for row_idx, row in enumerate(rows):
            if not isinstance(row, list):
                continue
            for btn_idx, btn in enumerate(row):
                if not isinstance(btn, dict):
                    continue
                stored_id = btn.get("id")
                fallback_id = f"{row_idx}-{btn_idx}"
                if stored_id == button_id or (not stored_id and button_id == fallback_id):
                    payload = {k: v for k, v in btn.items() if k in InlineButton.model_fields}
                    return InlineButton(**payload)
        return None

