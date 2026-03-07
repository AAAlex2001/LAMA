import logging
from typing import Optional
from sqlalchemy import select
from aiogram.types import CallbackQuery, ChatPermissions, Message
from aiogram.exceptions import TelegramAPIError

from backend.services.bot import CaptchaService
from backend.services.bot.triggers import TriggerService
from backend.models.bots import PendingApproval, TriggerType
from backend.services.webhook.base import get_bot_session
from backend.services.webhook.welcome import WelcomeHandler
from backend.services.webhook.callbacks.base import BaseCallbackProcessor

logger = logging.getLogger(__name__)


class CaptchaCallbackProcessor(BaseCallbackProcessor):
    """Обработчик ответов на капчу."""

    def __init__(self, db, bot_model):
        super().__init__(db, bot_model)
        self.trigger_service = TriggerService(db)

    async def process_captcha(self, callback_query: CallbackQuery) -> None:
        """Обработка ответа на капчу в ЛС."""
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

        async with get_bot_session(self.bot_model.token) as bot:
            user_id = callback_query.from_user.id
            chat_id = (
                callback_query.message.chat.id if callback_query.message else 0
            )

            if is_correct:
                await self.answer_callback(
                    bot,
                    callback_query.id,
                    "✅ Правильно! Заявка одобрена.",
                    True,
                )
                await self.approve_join_request(bot, pending_id)
                await self.fire_captcha_trigger(
                    bot,
                    user_id,
                    chat_id,
                    TriggerType.CAPTCHA_PASSED,
                    pending_id,
                    "private",
                )
            elif reason == "not_allowed":
                await self.answer_callback(
                    bot,
                    callback_query.id,
                    "⚠️ Эту капчу может решить только приглашённый.",
                    True,
                )
            else:
                await self.answer_callback(
                    bot, callback_query.id, "❌ Неправильный ответ.", True
                )
                await self.fire_captcha_trigger(
                    bot,
                    user_id,
                    chat_id,
                    TriggerType.CAPTCHA_FAILED,
                    pending_id,
                    "private",
                    user_answer,
                )

    async def process_group_captcha(
        self, callback_query: CallbackQuery
    ) -> None:
        """Обработка ответа на капчу в группе."""
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

        async with get_bot_session(self.bot_model.token) as bot:
            user_id = callback_query.from_user.id
            chat_id = (
                callback_query.message.chat.id if callback_query.message else 0
            )

            if is_correct:
                await self.answer_callback(
                    bot, callback_query.id, "✅ Правильно! Добро пожаловать!"
                )
                await self.delete_captcha_message(bot, callback_query.message)
                await self.unrestrict_user(bot, chat_id, user_id)
                await self.send_welcome(callback_query)
                await self.fire_captcha_trigger(
                    bot,
                    user_id,
                    chat_id,
                    TriggerType.CAPTCHA_PASSED,
                    pending_id,
                    "group",
                )
            elif reason == "not_allowed":
                await self.answer_callback(
                    bot,
                    callback_query.id,
                    "⚠️ Эту капчу может решить только приглашённый.",
                    True,
                )
            else:
                await self.answer_callback(
                    bot, callback_query.id, "❌ Неправильный ответ.", True
                )
                await self.fire_captcha_trigger(
                    bot,
                    user_id,
                    chat_id,
                    TriggerType.CAPTCHA_FAILED,
                    pending_id,
                    "group",
                    user_answer,
                )

    async def approve_join_request(self, bot, pending_id: int) -> None:
        """Одобрить заявку на вступление."""
        query = select(PendingApproval).where(PendingApproval.id == pending_id)
        result = await self.db.execute(query)
        pending = result.scalar_one_or_none()
        if not pending:
            logger.warning(f"PendingApproval {pending_id} not found")
            return
        try:
            await bot.approve_chat_join_request(
                chat_id=pending.chat_id, user_id=pending.user_id
            )
        except TelegramAPIError as e:
            logger.warning(
                f"Failed to approve join request "
                f"for user {pending.user_id}: {e}"
            )

    async def delete_captcha_message(self, bot, message) -> None:
        """Удалить сообщение с капчей."""
        if not message:
            return
        try:
            await bot.delete_message(
                chat_id=message.chat.id, message_id=message.message_id
            )
        except TelegramAPIError as e:
            logger.debug(f"Failed to delete captcha message: {e}")

    async def unrestrict_user(self, bot, chat_id: int, user_id: int) -> None:
        """Снять ограничения после капчи."""
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
                f"Failed to unrestrict user {user_id} in chat {chat_id}: {e}"
            )

    async def send_welcome(self, callback_query: CallbackQuery) -> None:
        """Отправить приветственное сообщение."""
        if not callback_query.message:
            return
        welcome_handler = WelcomeHandler(self.db, self.bot_model)
        fake_message = Message(
            message_id=0,
            date=callback_query.message.date,
            chat=callback_query.message.chat,
        )
        try:
            await welcome_handler.handle_new_member(
                fake_message, callback_query.from_user
            )
        except Exception as e:
            logger.error(f"Failed to send welcome message: {e}")

    async def fire_captcha_trigger(
        self,
        bot,
        user_id: int,
        chat_id: int,
        trigger_type: TriggerType,
        pending_id: int,
        chat_type: str,
        answer: Optional[str] = None,
    ) -> None:
        """Запустить триггер капчи."""
        context = {"pending_id": pending_id}
        if chat_type == "group":
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
                context=context,
            )
        except Exception as e:
            logger.error(f"Failed to fire {trigger_type.value} trigger: {e}")
