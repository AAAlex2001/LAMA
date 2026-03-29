import asyncio
import logging
from typing import Optional

from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert

from backend.models.bots import Bot as BotModel, BotCommand, BotCommandButtonClick
from backend.services.webhook.callbacks.base import BaseCallbackProcessor
from backend.services.bot_provider import resolve_by_token
from backend.schemas.publications.common import InlineButton
from backend.services.webhook.base import TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class BotCommandsCallbackProcessor(BaseCallbackProcessor):
    """Callback processor for bot commands inline buttons."""

    async def process_hidden_text(self, callback_query: CallbackQuery) -> None:
        command_id, button_id = self.parse_callback_data(callback_query.data)
        if command_id is None:
            return

        user_id = callback_query.from_user.id if callback_query.from_user else None
        chat_id = callback_query.message.chat.id if callback_query.message else None
        if not user_id or not chat_id:
            return

        button = await self.load_button(command_id, button_id)
        if not button:
            return

        bot = resolve_by_token(self.bot_model.token)
        is_subscriber = await self.check_subscriber(bot, chat_id, user_id)
        text = button.hidden_text_subscribed if is_subscriber else button.hidden_text_unsubscribed
        if not text:
            return
        await self.answer_callback(bot, callback_query.id, text, True)

    async def process_callback_action(self, callback_query: CallbackQuery) -> None:
        command_id, button_id = self.parse_callback_data(callback_query.data)
        if command_id is None:
            return

        user_id = callback_query.from_user.id if callback_query.from_user else None
        if not user_id:
            return

        button = await self.load_button(command_id, button_id)
        if not button:
            return

        await self.record_click(command_id, button_id, user_id)

        action = button.callback_action
        response = button.callback_response or "✅"

        bot = resolve_by_token(self.bot_model.token)

        try:
            if action == "send_dm":
                await self.handle_send_dm(bot, callback_query, user_id, button.callback_response)
                return
            if action == "reply_in_chat":
                await self.answer_callback(bot, callback_query.id, response, bool(button.callback_response))
                return
            if action == "track_click":
                count = await self.get_click_count(command_id, button_id)
                await self.answer_callback(bot, callback_query.id, f"✅ Кликов: {count}")
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

    async def record_click(self, command_id: int, button_id: str, user_id: int) -> None:
        stmt = (
            insert(BotCommandButtonClick)
            .values(command_id=command_id, button_id=button_id, user_id=user_id)
            .on_conflict_do_nothing(index_elements=["command_id", "button_id", "user_id"])
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def get_click_count(self, command_id: int, button_id: str) -> int:
        result = await self.db.scalar(
            select(func.count())
            .select_from(BotCommandButtonClick)
            .where(
                BotCommandButtonClick.command_id == command_id,
                BotCommandButtonClick.button_id == button_id,
            )
        )
        return result or 0

    async def handle_send_dm(
        self,
        bot,
        callback_query: CallbackQuery,
        user_id: int,
        response_text: Optional[str],
    ) -> None:
        if not response_text:
            await self.answer_callback(bot, callback_query.id, "✅")
            return
        try:
            await bot.send_message(chat_id=user_id, text=response_text)
            await self.answer_callback(bot, callback_query.id, "✅")
        except TelegramAPIError as e:
            logger.warning("Failed to send DM to %s: %s", user_id, e)
            await self.answer_callback(
                bot,
                callback_query.id,
                "❌ Не удалось отправить. Начните диалог с ботом.",
                True,
            )

    @staticmethod
    async def check_subscriber(bot, chat_id: int, user_id: int) -> bool:
        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(chat_id, user_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            return member.status in ("member", "administrator", "creator")
        except (TelegramAPIError, asyncio.TimeoutError):
            logger.warning("Check subscriber failed", exc_info=True)
            return False

