import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone

from aiogram.types import CallbackQuery, ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import CaptchaService
from backend.services.bot.triggers import TriggerService
from backend.models.bots import Bot as BotModel, PendingApproval, TriggerType
from backend.models.publications import Publication
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT

from backend.services.webhook.welcome import WelcomeHandler

logger = logging.getLogger(__name__)


class CallbackHandler:
    """Обработчик callback query от Telegram."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)

    async def process(self, callback_query: CallbackQuery) -> None:
        """Роутинг callback query по типу."""
        callback_data = callback_query.data
        if not callback_data:
            return

        if callback_data.startswith("captcha_"):
            await self.process_captcha(callback_query)
        elif callback_data.startswith("group_captcha_"):
            await self.process_group_captcha(callback_query)
        elif callback_data.startswith("admincall_"):
            await self.process_admin_call_action(callback_query)
        elif callback_data.startswith("hidden_text:"):
            await self.process_hidden_text(callback_query)

    async def process_admin_call_action(self, callback_query: CallbackQuery) -> None:
        """Обработка админских действий (бан/удаление сообщения)."""
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

        actor_user_id = callback_query.from_user.id if callback_query.from_user else 0

        async with get_bot_session() as telegram_bot:
            try:
                member = await asyncio.wait_for(
                    telegram_bot.get_chat_member(chat_id, actor_user_id),
                    timeout=TELEGRAM_API_TIMEOUT,
                )
                is_admin = member.status in ("administrator", "creator")
            except (TelegramAPIError, asyncio.TimeoutError):
                is_admin = False

            if not is_admin:
                await self.answer_callback(telegram_bot, callback_query.id, "❌ Недостаточно прав.", True)
                return

            try:
                if action == "del":
                    await telegram_bot.delete_message(chat_id=chat_id, message_id=target_message_id)
                    answer_text = "🗑 Сообщение удалено."
                elif action == "ban":
                    if target_user_id <= 0:
                        await self.answer_callback(telegram_bot, callback_query.id, "❌ Автор неизвестен.", True)
                        return
                    await telegram_bot.ban_chat_member(chat_id=chat_id, user_id=target_user_id)
                    answer_text = "🚫 Пользователь забанен."
                else:
                    return

                if callback_query.message:
                    try:
                        await telegram_bot.edit_message_reply_markup(
                            chat_id=callback_query.message.chat.id,
                            message_id=callback_query.message.message_id,
                            reply_markup=None,
                        )
                    except TelegramAPIError as e:
                        logger.debug(f"Failed to remove keyboard: {e}")

                await self.answer_callback(telegram_bot, callback_query.id, answer_text)

            except TelegramAPIError as e:
                logger.warning(
                    f"Admin action '{action}' failed in chat {chat_id}: {e}")
                await self.answer_callback(telegram_bot, callback_query.id, f"❌ Ошибка: {e}", True)

    async def process_captcha(self, callback_query: CallbackQuery) -> None:
        """Обработка ответа на капчу в ЛС (при заявке на вступление)."""
        if not callback_query.data:
            return
        parts = callback_query.data.split("_")
        if len(parts) < 3:
            return

        try:
            pending_id = int(parts[1])
            user_answer = parts[2]
        except ValueError:
            return

        captcha_service = CaptchaService(self.db)
        is_correct, reason = await captcha_service.check_captcha_answer(
            pending_id, user_answer, solver_user_id=callback_query.from_user.id
        )

        async with get_bot_session() as telegram_bot:
            user_id = callback_query.from_user.id
            chat_id = callback_query.message.chat.id if callback_query.message else 0

            if is_correct:
                await self.answer_callback(telegram_bot, callback_query.id, "✅ Правильно! Заявка одобрена.", True)
                await self.approve_join_request(telegram_bot, pending_id)
                await self.fire_captcha_trigger(telegram_bot, user_id, chat_id, TriggerType.CAPTCHA_PASSED, pending_id, 'private')
            elif reason == "not_allowed":
                await self.answer_callback(telegram_bot, callback_query.id, "⚠️ Эту капчу может решить только приглашённый.", True)
            else:
                await self.answer_callback(telegram_bot, callback_query.id, "❌ Неправильный ответ.", True)
                await self.fire_captcha_trigger(telegram_bot, user_id, chat_id, TriggerType.CAPTCHA_FAILED, pending_id, 'private', user_answer)

    async def process_group_captcha(self, callback_query: CallbackQuery) -> None:
        """Обработка ответа на капчу в группе (после вступления)."""
        if not callback_query.data:
            return
        parts = callback_query.data.split("_")
        if len(parts) < 4:
            return

        try:
            pending_id = int(parts[2])
            user_answer = parts[3]
        except ValueError:
            return

        captcha_service = CaptchaService(self.db)
        is_correct, reason = await captcha_service.check_captcha_answer(
            pending_id, user_answer, solver_user_id=callback_query.from_user.id
        )

        async with get_bot_session() as telegram_bot:
            user_id = callback_query.from_user.id
            chat_id = callback_query.message.chat.id if callback_query.message else 0

            if is_correct:
                await self.answer_callback(telegram_bot, callback_query.id, "✅ Правильно! Добро пожаловать!")
                await self.delete_captcha_message(telegram_bot, callback_query.message)
                await self.unrestrict_user(telegram_bot, chat_id, user_id)
                await self.send_welcome(callback_query)
                await self.fire_captcha_trigger(telegram_bot, user_id, chat_id, TriggerType.CAPTCHA_PASSED, pending_id, 'group')
            elif reason == "not_allowed":
                await self.answer_callback(telegram_bot, callback_query.id, "⚠️ Эту капчу может решить только приглашённый.", True)
            else:
                await self.answer_callback(telegram_bot, callback_query.id, "❌ Неправильный ответ.", True)
                await self.fire_captcha_trigger(telegram_bot, user_id, chat_id, TriggerType.CAPTCHA_FAILED, pending_id, 'group', user_answer)

    async def process_hidden_text(self, callback_query: CallbackQuery) -> None:
        """Показать скрытый текст подписчику."""
        callback_data = callback_query.data or ""
        parts = callback_data.split(":")

        if len(parts) < 3:
            return

        try:
            publication_id = int(parts[1])
        except ValueError:
            return

        button_id = ":".join(parts[2:])

        user_id = callback_query.from_user.id if callback_query.from_user else None
        chat_id = callback_query.message.chat.id if callback_query.message else None
        if not user_id or not chat_id:
            return

        result = await self.db.execute(select(Publication).where(Publication.id == publication_id))
        publication = result.scalar_one_or_none()
        if not publication or not publication.inline_keyboard:
            return

        hidden_text = self._find_hidden_text(publication.inline_keyboard, button_id)
        if not hidden_text:
            return

        async with get_bot_session() as telegram_bot:
            is_subscriber = await self._is_subscriber(telegram_bot, chat_id, user_id)
            if not is_subscriber:
                await self.answer_callback(
                    telegram_bot,
                    callback_query.id,
                    "❌ Доступно только подписчикам.",
                    True,
                )
                return

            await self.answer_callback(telegram_bot, callback_query.id, hidden_text, True)

    @staticmethod
    def _find_hidden_text(inline_keyboard, button_id: str) -> Optional[str]:
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
                if stored_id == button_id or (not stored_id and button_id == fallback_id):
                    return btn.get("hidden_text")

        return None

    @staticmethod
    async def _is_subscriber(bot, chat_id: int, user_id: int) -> bool:
        try:
            member = await asyncio.wait_for(
                bot.get_chat_member(chat_id, user_id),
                timeout=TELEGRAM_API_TIMEOUT,
            )
            return member.status in ("member", "administrator", "creator")
        except (TelegramAPIError, asyncio.TimeoutError):
            return False

    async def answer_callback(self, bot, callback_id: str, text: str, show_alert: bool = False) -> None:
        """Ответить на callback query. Игнорирует ошибки истекшего query."""
        try:
            await bot.answer_callback_query(callback_id, text=text, show_alert=show_alert)
        except TelegramAPIError as e:
            if "query is too old" not in str(e):
                logger.warning(f"Failed to answer callback: {e}")

    async def approve_join_request(self, bot, pending_id: int) -> None:
        """Одобрить заявку на вступление в канал/группу."""
        query = select(PendingApproval).where(PendingApproval.id == pending_id)
        result = await self.db.execute(query)
        pending = result.scalar_one_or_none()
        if not pending:
            logger.warning(f"PendingApproval {pending_id} not found")
            return
        try:
            await bot.approve_chat_join_request(chat_id=pending.chat_id, user_id=pending.user_id)
        except TelegramAPIError as e:
            logger.warning(
                f"Failed to approve join request for user {pending.user_id}: {e}")

    async def delete_captcha_message(self, bot, message) -> None:
        """Удалить сообщение с капчей."""
        if not message:
            return
        try:
            await bot.delete_message(chat_id=message.chat.id, message_id=message.message_id)
        except TelegramAPIError as e:
            logger.debug(f"Failed to delete captcha message: {e}")

    async def unrestrict_user(self, bot, chat_id: int, user_id: int) -> None:
        """Снять ограничения с пользователя после прохождения капчи."""
        try:
            await bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=ChatPermissions(
                    can_send_messages=True,
                    can_send_media_messages=True,
                    can_send_other_messages=True,
                    can_add_web_page_previews=True,
                ),
            )
        except TelegramAPIError as e:
            logger.warning(
                f"Failed to unrestrict user {user_id} in chat {chat_id}: {e}")

    async def send_welcome(self, callback_query: CallbackQuery) -> None:
        """Отправить приветственное сообщение после прохождения капчи."""
        if not callback_query.message:
            return

        welcome_handler = WelcomeHandler(self.db, self.bot_model)
        fake_message = Message(
            message_id=0,
            date=callback_query.message.date,
            chat=callback_query.message.chat,
        )
        try:
            await welcome_handler.handle_new_member(fake_message, callback_query.from_user)
        except Exception as e:
            logger.error(f"Failed to send welcome message: {e}")

    async def fire_captcha_trigger(self, bot, user_id: int, chat_id: int, trigger_type: TriggerType, pending_id: int, chat_type: str, answer: Optional[str] = None) -> None:
        """Запустить триггер CAPTCHA_PASSED или CAPTCHA_FAILED."""
        context = {"pending_id": pending_id}
        if chat_type == 'group':
            context["group_captcha"] = True
        if answer:
            context["answer"] = answer
        try:
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=trigger_type,
                user_id=user_id,
                chat_id=chat_id,
                telegram_bot=bot,
                chat_type=chat_type,
                context=context
            )
        except Exception as e:
            logger.error(f"Failed to fire {trigger_type.value} trigger: {e}")
