import asyncio
import logging
from dataclasses import dataclass

from aiogram.exceptions import TelegramAPIError
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.callbacks.answer_callback import AnswerCallback
from backend.services.webhook.types import TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AdminCallbackData:
    """Распарсенный admincall_-callback: action + ids."""

    action: str
    chat_id: int
    user_id: int
    message_id: int


class ExecuteAdminAction:
    """Выполняет admin-action (kick/ban/unmute) из inline-кнопки админ-меню."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, callback_query: CallbackQuery) -> None:
        data = self.get_data(callback_query.data)
        if not data:
            return

        actor_id = callback_query.from_user.id if callback_query.from_user else 0
        bot = resolve_by_token(self.bot_model.token)
        if not await self.is_admin(bot, data.chat_id, actor_id):
            await AnswerCallback().execute(bot, callback_query.id, "Недостаточно прав.", True)
            return

        try:
            answer_text = await self.apply_action(bot, data)
            if not answer_text:
                return
            await self.remove_keyboard(bot, callback_query)
            await AnswerCallback().execute(bot, callback_query.id, answer_text)
        except TelegramAPIError as exc:
            logger.warning(
                "Admin action '%s' failed in chat %s: %s",
                data.action,
                data.chat_id,
                exc,
            )
            await AnswerCallback().execute(bot, callback_query.id, f"Ошибка: {exc}", True)

    async def apply_action(self, bot, data: AdminCallbackData) -> str | None:
        if data.action == "del":
            await bot.delete_message(chat_id=data.chat_id, message_id=data.message_id)
            return "Сообщение удалено."
        if data.action == "ban":
            if data.user_id <= 0:
                return "Автор неизвестен."
            await bot.ban_chat_member(chat_id=data.chat_id, user_id=data.user_id)
            return "Пользователь забанен."
        if data.action == "ignore":
            return "Проигнорировано."
        return None

    async def is_admin(self, bot, chat_id: int, user_id: int) -> bool:
        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(chat_id, user_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            return member.status in ("administrator", "creator")
        except (TelegramAPIError, asyncio.TimeoutError):
            logger.warning("Failed to check admin status", exc_info=True)
            return False

    @staticmethod
    async def remove_keyboard(bot, callback_query: CallbackQuery) -> None:
        if not callback_query.message:
            return
        try:
            await bot.edit_message_reply_markup(
                chat_id=callback_query.message.chat.id,
                message_id=callback_query.message.message_id,
                reply_markup=None,
            )
        except TelegramAPIError as exc:
            logger.debug("Failed to remove keyboard: %s", exc)

    @staticmethod
    def get_data(callback_data: str | None) -> AdminCallbackData | None:
        parts = (callback_data or "").split("_")
        if len(parts) != 5:
            return None
        try:
            return AdminCallbackData(
                action=parts[1],
                chat_id=int(parts[2]),
                user_id=int(parts[3]),
                message_id=int(parts[4]),
            )
        except ValueError:
            return None
