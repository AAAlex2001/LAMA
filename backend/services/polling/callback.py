"""Обработчик callback query polling-ботов: капча."""

import logging

from aiogram import Bot
from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, PendingApproval
from backend.services.bot import CaptchaService
from backend.services.polling.base import approve_join_request

logger = logging.getLogger(__name__)


class PollingCallbackHandler:
    """Обработчик callback query (капча в ЛС)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot: Bot):
        self.db = db
        self.bot_model = bot_model
        self.bot = telegram_bot

    async def process(self, callback_query: CallbackQuery) -> None:
        """Роутинг callback query по префиксу."""
        data = callback_query.data or ""

        if data.startswith("captcha_"):
            await self.process_captcha(callback_query)
        else:
            await self.answer(callback_query.id, "")

    async def process_captcha(self, callback_query: CallbackQuery) -> None:
        """Проверка ответа на капчу и одобрение заявки."""
        parts = (callback_query.data or "").split("_")
        if len(parts) < 3:
            return

        try:
            pending_id = int(parts[1])
            user_answer = parts[2]
        except ValueError:
            return

        captcha_service = CaptchaService(self.db)
        is_correct, reason = await captcha_service.check_captcha_answer(
            pending_id, user_answer, solver_user_id=callback_query.from_user.id,
        )

        if is_correct:
            await self.approve_after_captcha(callback_query, pending_id)
        elif reason == "not_allowed":
            await self.answer(callback_query.id, "⚠️ Эту капчу может решить только приглашённый.", show_alert=True)
        else:
            await self.answer(callback_query.id, "❌ Неправильный ответ. Попробуйте ещё раз.", show_alert=True)

    async def approve_after_captcha(self, callback_query: CallbackQuery, pending_id: int) -> None:
        """Одобрить заявку после правильного ответа на капчу."""
        result = await self.db.execute(
            select(PendingApproval).where(PendingApproval.id == pending_id)
        )
        pending = result.scalar_one_or_none()

        if not pending:
            await self.answer(callback_query.id, "❌ Заявка не найдена.", show_alert=True)
            return

        success = await approve_join_request(pending.chat_id, pending.user_id)
        text = "✅ Правильно! Заявка одобрена." if success else "❌ Ошибка одобрения заявки."
        await self.answer(callback_query.id, text, show_alert=True)

    async def answer(self, callback_id: str, text: str, show_alert: bool = False) -> None:
        """Ответить на callback query."""
        try:
            await self.bot.answer_callback_query(callback_id, text=text, show_alert=show_alert)
        except TelegramAPIError:
            pass
