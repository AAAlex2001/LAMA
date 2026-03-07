import asyncio
import logging
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramAPIError

from backend.models.publications import Publication, ButtonClick
from backend.schemas.publications.common import InlineButton
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT
from backend.services.webhook.callbacks.base import BaseCallbackProcessor

logger = logging.getLogger(__name__)


class PostsCallbackProcessor(BaseCallbackProcessor):
    """
    Обработчик callback-запросов, связанных с
    публикациями (кнопки, скрытый текст).
    """

    async def process_hidden_text(self, callback_query: CallbackQuery) -> None:
        """Показать скрытый текст подписчику / не подписчику."""
        publication_id, button_id = self.parse_callback_data(
            callback_query.data
        )
        if publication_id is None:
            return

        user_id = (
            callback_query.from_user.id if callback_query.from_user else None
        )
        chat_id = (
            callback_query.message.chat.id if callback_query.message else None
        )
        if not user_id or not chat_id:
            return

        button = await self.load_button(publication_id, button_id)
        if not button:
            return

        async with get_bot_session(self.bot_model.token) as bot:
            is_subscriber = await self.check_subscriber(bot, chat_id, user_id)
            text = (
                button.hidden_text_subscribed
                if is_subscriber
                else button.hidden_text_unsubscribed
            )
            if not text:
                return
            await self.answer_callback(bot, callback_query.id, text, True)

    async def process_callback_action(
        self, callback_query: CallbackQuery
    ) -> None:
        """Обработка callback кнопки: send_dm / reply_in_chat / track_click."""
        publication_id, button_id = self.parse_callback_data(
            callback_query.data
        )
        if publication_id is None:
            return

        user_id = (
            callback_query.from_user.id if callback_query.from_user else None
        )
        if not user_id:
            return

        button = await self.load_button(publication_id, button_id)
        if not button:
            return

        await self.record_click(publication_id, button_id, user_id)

        async with get_bot_session(self.bot_model.token) as bot:
            if button.callback_action == "send_dm":
                await self.handle_send_dm(
                    bot, callback_query, user_id, button.callback_response
                )
            elif button.callback_action == "reply_in_chat":
                text = button.callback_response or "✅"
                await self.answer_callback(
                    bot,
                    callback_query.id,
                    text,
                    bool(button.callback_response),
                )
            elif button.callback_action == "track_click":
                count = await self.get_click_count(publication_id, button_id)
                await self.answer_callback(
                    bot, callback_query.id, f"✅ Кликов: {count}"
                )
            else:
                await self.answer_callback(bot, callback_query.id, "✅")

    async def handle_send_dm(
        self,
        bot,
        callback_query: CallbackQuery,
        user_id: int,
        response_text: Optional[str],
    ) -> None:
        """Отправить сообщение в ЛС пользователю."""
        if not response_text:
            await self.answer_callback(bot, callback_query.id, "✅")
            return
        try:
            await bot.send_message(chat_id=user_id, text=response_text)
            await self.answer_callback(bot, callback_query.id, "✅")
        except TelegramAPIError as e:
            logger.warning(f"Failed to send DM to {user_id}: {e}")
            await self.answer_callback(
                bot,
                callback_query.id,
                "❌ Не удалось отправить. Начните диалог с ботом.",
                True,
            )

    def parse_callback_data(
        self, data: Optional[str]
    ) -> tuple[Optional[int], str]:
        """Парсинг callback_data формата 'prefix:publication_id:button_id'."""
        if not data:
            return None, ""
        parts = data.split(":")
        if len(parts) < 3:
            return None, ""
        try:
            publication_id = int(parts[1])
        except ValueError:
            return None, ""
        button_id = ":".join(parts[2:])
        return publication_id, button_id

    async def load_button(
        self, publication_id: int, button_id: str
    ) -> Optional[InlineButton]:
        """Загрузить публикацию и найти кнопку по ID."""
        result = await self.db.execute(
            select(Publication).where(Publication.id == publication_id)
        )
        publication = result.scalar_one_or_none()
        if not publication or not publication.inline_keyboard:
            return None
        return self.find_button(publication.inline_keyboard, button_id)

    @staticmethod
    def find_button(inline_keyboard, button_id: str) -> Optional[InlineButton]:
        """Найти кнопку в inline_keyboard по ID."""
        if not inline_keyboard:
            return None

        if isinstance(inline_keyboard, dict):
            rows = inline_keyboard.get("buttons", [])
        elif isinstance(inline_keyboard, list):
            rows = inline_keyboard
        else:
            return None

        for row_idx, row in enumerate(rows):
            if not isinstance(row, list):
                continue
            for btn_idx, btn in enumerate(row):
                if not isinstance(btn, dict):
                    continue
                stored_id = btn.get("id")
                fallback_id = f"{row_idx}-{btn_idx}"
                if stored_id == button_id or (
                    not stored_id and button_id == fallback_id
                ):
                    return InlineButton(
                        **{
                            k: v
                            for k, v in btn.items()
                            if k in InlineButton.model_fields
                        }
                    )
        return None

    async def record_click(
        self, publication_id: int, button_id: str, user_id: int
    ) -> None:
        """Записать клик (уникальный по юзеру)."""
        stmt = (
            insert(ButtonClick)
            .values(
                publication_id=publication_id,
                button_id=button_id,
                user_id=user_id,
            )
            .on_conflict_do_nothing(
                index_elements=["publication_id", "button_id", "user_id"]
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def get_click_count(
        self, publication_id: int, button_id: str
    ) -> int:
        """Количество уникальных кликов по кнопке."""
        result = await self.db.scalar(
            select(func.count())
            .select_from(ButtonClick)
            .where(
                ButtonClick.publication_id == publication_id,
                ButtonClick.button_id == button_id,
            )
        )
        return result or 0

    @staticmethod
    async def check_subscriber(bot, chat_id: int, user_id: int) -> bool:
        """Проверить подписку пользователя на канал."""
        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(chat_id, user_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            return member.status in ("member", "administrator", "creator")
        except (TelegramAPIError, asyncio.TimeoutError):
            logger.warning("Check subscriber failed", exc_info=True)
            return False
