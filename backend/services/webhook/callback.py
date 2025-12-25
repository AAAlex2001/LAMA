"""
Обработчик callback query (капча и др.)
"""
import asyncio
import logging

from aiogram.types import CallbackQuery, ChatPermissions
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
        elif callback_data.startswith("group_captcha_"):
            await self.process_group_captcha(callback_query)
        elif callback_data.startswith("admincall_"):
            await self.process_admin_call_action(callback_query)

    async def process_admin_call_action(self, callback_query: CallbackQuery) -> None:
        """Обработка действий из вызова админа (ban/delete выбранного сообщения)."""
        callback_data = callback_query.data or ""
        parts = callback_data.split("_")

        # admincall_{action}_{chat_id}_{user_id}_{message_id}
        if len(parts) != 5:
            return

        _, action, chat_id_raw, user_id_raw, message_id_raw = parts

        try:
            chat_id = int(chat_id_raw)
            target_user_id = int(user_id_raw)
            target_message_id = int(message_id_raw)
        except ValueError:
            logger.warning(f"Invalid admincall callback data: {callback_data}")
            return

        actor_user_id = callback_query.from_user.id if callback_query.from_user else 0

        async with get_bot_session() as telegram_bot:
            # Проверяем права того, кто нажал кнопку: должен быть админом в целевой группе
            try:
                member = await asyncio.wait_for(
                    telegram_bot.get_chat_member(chat_id, actor_user_id),
                    timeout=TELEGRAM_API_TIMEOUT,
                )
                is_admin = member.status in ("administrator", "creator")
            except (TelegramAPIError, asyncio.TimeoutError):
                is_admin = False

            if not is_admin:
                try:
                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text="❌ Недостаточно прав для этого действия.",
                        show_alert=True,
                    )
                except Exception:
                    pass
                return

            try:
                if action == "del":
                    await asyncio.wait_for(
                        telegram_bot.delete_message(chat_id=chat_id, message_id=target_message_id),
                        timeout=TELEGRAM_API_TIMEOUT,
                    )
                    answer_text = "🗑 Сообщение удалено."
                elif action == "ban":
                    if target_user_id <= 0:
                        await telegram_bot.answer_callback_query(
                            callback_query.id,
                            text="❌ Нельзя забанить: автор сообщения неизвестен.",
                            show_alert=True,
                        )
                        return
                    await asyncio.wait_for(
                        telegram_bot.ban_chat_member(chat_id=chat_id, user_id=target_user_id),
                        timeout=TELEGRAM_API_TIMEOUT,
                    )
                    answer_text = "🚫 Пользователь забанен."
                else:
                    return

                # Убираем клавиатуру с сообщения в ЛС, чтобы не жали повторно
                if callback_query.message:
                    try:
                        await asyncio.wait_for(
                            telegram_bot.edit_message_reply_markup(
                                chat_id=callback_query.message.chat.id,
                                message_id=callback_query.message.message_id,
                                reply_markup=None,
                            ),
                            timeout=TELEGRAM_API_TIMEOUT,
                        )
                    except (TelegramAPIError, asyncio.TimeoutError):
                        pass

                await telegram_bot.answer_callback_query(
                    callback_query.id,
                    text=answer_text,
                    show_alert=False,
                )

            except (TelegramAPIError, asyncio.TimeoutError) as e:
                logger.warning(f"Admincall action failed ({action}) in chat {chat_id}: {e}")
                try:
                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text=f"❌ Не удалось выполнить действие: {str(e)}",
                        show_alert=True,
                    )
                except Exception:
                    pass

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
            is_correct, reason = await captcha_service.check_captcha_answer(
                pending_id, user_answer, solver_user_id=callback_query.from_user.id
            )

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
                        chat_type='private',
                        context={"pending_id": pending_id}
                    )
                else:
                    if reason == "not_allowed":
                        await telegram_bot.answer_callback_query(
                            callback_query.id,
                            text="⚠️ Эту капчу может решить только приглашённый пользователь.",
                            show_alert=True,
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
                        chat_type='private',
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
    
    async def process_group_captcha(self, callback_query: CallbackQuery) -> None:
        """Обработка капчи в группе"""
        callback_data = callback_query.data
        parts = callback_data.split("_")
        
        if len(parts) < 4:
            return
        
        try:
            pending_id = int(parts[2])
            user_answer = parts[3]
            
            captcha_service = CaptchaService(self.db)
            is_correct, reason = await captcha_service.check_captcha_answer(
                pending_id, user_answer, solver_user_id=callback_query.from_user.id
            )
            
            async with get_bot_session() as telegram_bot:
                user_id = callback_query.from_user.id
                chat_id = callback_query.message.chat.id if callback_query.message else 0
                
                if is_correct:
                    # Удаляем сообщение с капчей
                    if callback_query.message:
                        try:
                            await telegram_bot.delete_message(
                                chat_id=chat_id,
                                message_id=callback_query.message.message_id
                            )
                        except:
                            pass
                    
                    try:
                        await telegram_bot.restrict_chat_member(
                            chat_id=chat_id,
                            user_id=user_id,
                            permissions=ChatPermissions(
                                can_send_messages=True,
                                can_send_media_messages=True,
                                can_send_other_messages=True,
                                can_add_web_page_previews=True,
                            ),
                        )
                    except Exception:
                        pass

                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text="✅ Правильно! Добро пожаловать!",
                        show_alert=False,
                    )
                    
                    # Отправляем приветствие
                    from backend.services.webhook.welcome import WelcomeHandler
                    welcome_handler = WelcomeHandler(self.db, self.bot_model)
                    
                    # Создаём фейковое сообщение для приветствия
                    from aiogram.types import Message, Chat, User as TgUser
                    fake_message = Message(
                        message_id=0,
                        date=callback_query.message.date if callback_query.message else None,
                        chat=callback_query.message.chat if callback_query.message else None,
                    )
                    fake_user = callback_query.from_user
                    
                    await welcome_handler.handle_new_member(fake_message, fake_user)
                    
                    # Триггер CAPTCHA_PASSED
                    await self.trigger_service.fire_event(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.CAPTCHA_PASSED,
                        user_id=user_id,
                        chat_id=chat_id,
                        telegram_bot=telegram_bot,                        chat_type='private',                        chat_type='group',
                        context={"pending_id": pending_id, "group_captcha": True}
                    )
                else:
                    if reason == "not_allowed":
                        await telegram_bot.answer_callback_query(
                            callback_query.id,
                            text="⚠️ Эту капчу может решить только приглашённый пользователь.",
                            show_alert=True,
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
                        chat_type='group',
                        context={"pending_id": pending_id, "answer": user_answer, "group_captcha": True}
                    )
                    
        except ValueError:
            logger.warning(f"Invalid group captcha callback data: {callback_data}")
        except Exception as e:
            logger.error(f"Group captcha callback error: {e}", exc_info=True)

