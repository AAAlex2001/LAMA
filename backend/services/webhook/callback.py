"""
Обработчик callback query (капча и др.)
"""
import asyncio
import logging

from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import CaptchaService
from backend.services.bot.triggers import TriggerService
from backend.models.bots import Bot as BotModel, PendingApproval, TriggerType
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class CallbackHandler:
    """Обработчик callback query"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)

    async def process(self, callback_query: CallbackQuery) -> None:
        """Обработка callback query"""
        callback_data = callback_query.data

        if callback_data.startswith("captcha_"):
            await self.process_captcha(callback_query)

    async def process_captcha(self, callback_query: CallbackQuery) -> None:
        """Обработка капчи"""
        callback_data = callback_query.data
        parts = callback_data.split("_")

        if len(parts) < 3:
            return

        try:
            pending_id = int(parts[1])
            user_answer = parts[2]

            captcha_service = CaptchaService(self.db)
            is_correct = await captcha_service.check_captcha_answer(pending_id, user_answer)

            async with get_bot_session() as telegram_bot:
                user_id = callback_query.from_user.id
                chat_id = callback_query.message.chat.id if callback_query.message else 0

                if is_correct:
                    # Одобряем заявку
                    query = select(PendingApproval).where(PendingApproval.id == pending_id)
                    result = await self.db.execute(query)
                    pending_approval = result.scalar_one_or_none()

                    if pending_approval:
                        try:
                            await asyncio.wait_for(
                                telegram_bot.approve_chat_join_request(
                                    chat_id=pending_approval.chat_id,
                                    user_id=pending_approval.user_id,
                                ),
                                timeout=TELEGRAM_API_TIMEOUT
                            )
                        except (TelegramAPIError, asyncio.TimeoutError):
                            pass

                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text="✅ Правильно! Заявка одобрена.",
                        show_alert=True,
                    )

                    # Триггер CAPTCHA_PASSED
                    await self.trigger_service.fire_event(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.CAPTCHA_PASSED,
                        user_id=user_id,
                        chat_id=chat_id,
                        telegram_bot=telegram_bot,
                        context={"pending_id": pending_id}
                    )
                else:
                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text="❌ Неправильный ответ. Попробуйте ещё раз.",
                        show_alert=True,
                    )

                    # Триггер CAPTCHA_FAILED
                    await self.trigger_service.fire_event(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.CAPTCHA_FAILED,
                        user_id=user_id,
                        chat_id=chat_id,
                        telegram_bot=telegram_bot,
                        context={"pending_id": pending_id, "answer": user_answer}
                    )

        except ValueError:
            logger.warning(f"Invalid captcha callback data: {callback_data}")
        except Exception as e:
            logger.error(f"Callback query error: {e}", exc_info=True)

            try:
                async with get_bot_session() as telegram_bot:
                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text="❌ Ошибка обработки ответа.",
                        show_alert=True,
                    )
            except Exception:
                pass

