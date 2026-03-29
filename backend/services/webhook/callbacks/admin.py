import asyncio
import logging
from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramAPIError

from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.base import TELEGRAM_API_TIMEOUT
from backend.services.webhook.callbacks.base import BaseCallbackProcessor

logger = logging.getLogger(__name__)


class AdminCallbackProcessor(BaseCallbackProcessor):
    """Обработчик админских callback-запросов."""

    async def process_admin_call_action(
        self, callback_query: CallbackQuery
    ) -> None:
        """Обработка админских действий (бан/удаление)."""
        callback_data = callback_query.data or ""
        parts = callback_data.split("_")
        if len(parts) != 5:
            return

        _, action, chat_id_raw, user_id_raw, message_id_raw = parts
        try:
            chat_id = int(chat_id_raw)
            target_user_id = int(user_id_raw)
            target_message_id = int(message_id_raw)
        except ValueError:
            return

        actor_user_id = (
            callback_query.from_user.id if callback_query.from_user else 0
        )

        bot = resolve_by_token(self.bot_model.token)
        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(chat_id, actor_user_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            is_admin = member.status in ("administrator", "creator")
        except (TelegramAPIError, asyncio.TimeoutError):
            logger.warning("Failed to check admin status", exc_info=True)
            is_admin = False

        if not is_admin:
            await self.answer_callback(
                bot, callback_query.id, "❌ Недостаточно прав.", True
            )
            return

        try:
            if action == "del":
                await bot.delete_message(
                    chat_id=chat_id, message_id=target_message_id
                )
                answer_text = "🗑 Сообщение удалено."
            elif action == "ban":
                if target_user_id <= 0:
                    await self.answer_callback(
                        bot,
                        callback_query.id,
                        "❌ Автор неизвестен.",
                        True,
                    )
                    return
                await bot.ban_chat_member(
                    chat_id=chat_id, user_id=target_user_id
                )
                answer_text = "🚫 Пользователь забанен."
            elif action == "ignore":
                answer_text = "✅ Проигнорировано."
            else:
                return

            if callback_query.message:
                try:
                    await bot.edit_message_reply_markup(
                        chat_id=callback_query.message.chat.id,
                        message_id=callback_query.message.message_id,
                        reply_markup=None,
                    )
                except TelegramAPIError as e:
                    logger.debug(f"Failed to remove keyboard: {e}")

            await self.answer_callback(bot, callback_query.id, answer_text)
        except TelegramAPIError as e:
            logger.warning(
                f"Admin action '{action}' failed in chat {chat_id}: {e}"
            )
            await self.answer_callback(
                bot, callback_query.id, f"❌ Ошибка: {e}", True
            )
