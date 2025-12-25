"""
Обработчик заявок на вступление
"""
import logging
import random

from aiogram.types import ChatJoinRequest, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import BotService, CaptchaService
from backend.services.bot.triggers import TriggerService
from backend.services.webhook.welcome import WelcomeHandler
from backend.models.bots import Bot as BotModel, PendingJoinApproval, TriggerType, ApprovalMode, CaptchaMode
from backend.services.webhook.base import get_bot_session

logger = logging.getLogger(__name__)


class JoinRequestHandler:
    """Обработчик заявок на вступление"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.bot_service = BotService(db)
        self.trigger_service = TriggerService(db)
        self.welcome_handler = WelcomeHandler(db, bot_model)

    async def process(self, join_request: ChatJoinRequest) -> None:
        """Обработка заявки на вступление"""
        try:
            async with get_bot_session() as telegram_bot:
                user_id = join_request.from_user.id
                chat_id = join_request.chat.id

                # Триггер JOIN_REQUEST_CREATED
                await self.trigger_service.fire_event(
                    bot_id=self.bot_model.id,
                    trigger_type=TriggerType.JOIN_REQUEST_CREATED,
                    user_id=user_id,
                    chat_id=chat_id,
                    telegram_bot=telegram_bot,
                    chat_type='private',
                    context={
                        "username": join_request.from_user.username,
                        "first_name": join_request.from_user.first_name,
                        "chat_title": join_request.chat.title,
                    }
                )

                # Проверка критериев одобрения
                should_approve, missing = await self.bot_service.check_approval_criteria(
                    self.bot_model,
                    user_id
                )

                if not should_approve and missing:
                    # Сохраняем ожидание
                    pending = PendingJoinApproval(
                        bot_id=self.bot_model.id,
                        user_id=user_id,
                        chat_id=chat_id,
                        missing_channels=missing,
                    )
                    self.db.add(pending)
                    await self.db.commit()

                # MANUAL режим - только капча (приветствие через триггеры)
                if self.bot_model.auto_approval_mode == ApprovalMode.MANUAL:
                    await self.handle_manual_mode(telegram_bot, join_request)
                    return

                # CRITERIA режим - отправка требований подписки
                elif self.bot_model.auto_approval_mode == ApprovalMode.CRITERIA and not should_approve:
                    if missing:
                        await self.send_subscription_requirements(telegram_bot, user_id, missing)
                    return

                # AUTO режим или CRITERIA с выполненными условиями - одобряем
                if should_approve:
                    approved = await self.approve_join_request(chat_id, user_id)
                    if approved:
                        await self.trigger_service.fire_event(
                            bot_id=self.bot_model.id,
                            trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                            user_id=user_id,
                            chat_id=chat_id,
                            telegram_bot=telegram_bot,
                            chat_type='private',
                            context={
                                "username": join_request.from_user.username,
                                "first_name": join_request.from_user.first_name,
                            }
                        )

        except Exception as e:
            logger.error(f"Join request error: {e}", exc_info=True)

    async def handle_manual_mode(self, telegram_bot, join_request: ChatJoinRequest) -> None:
        """Обработка MANUAL режима - отправка капчи в ЛС."""
        captcha_mode = getattr(self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
        
        if captcha_mode not in (CaptchaMode.JOIN_REQUEST, CaptchaMode.BOTH):
            return

        try:
            captcha_service = CaptchaService(self.db)
            question, answer = captcha_service.generate_captcha()

            pending = await captcha_service.create_pending_approval(
                bot_id=self.bot_model.id,
                user_id=join_request.from_user.id,
                chat_id=join_request.chat.id,
                captcha_question=question,
                captcha_answer=answer,
            )

            # Генерируем варианты
            correct = int(answer)
            options = {correct}
            while len(options) < 3:
                options.add(correct + random.randint(1, 4))

            options_list = list(options)
            random.shuffle(options_list)

            buttons = [[
                InlineKeyboardButton(text=str(opt), callback_data=f"captcha_{pending.id}_{opt}")
            ] for opt in options_list]

            await telegram_bot.send_message(
                chat_id=join_request.from_user.id,
                text=question,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            )
            logger.info(f"Captcha sent to {join_request.from_user.id}")

        except TelegramAPIError as e:
            logger.warning(f"Captcha send failed: {e}")

    async def send_subscription_requirements(
        self,
        telegram_bot,
        user_id: int,
        missing_channels: list[int]
    ) -> None:
        """Отправить требования по подписке"""
        try:
            message_text = "📢 Для вступления подпишитесь на каналы:\n\n"
            buttons = []

            for idx, channel_id in enumerate(missing_channels, 1):
                try:
                    chat = await telegram_bot.get_chat(channel_id)
                    title = chat.title or f"Канал {idx}"

                    if chat.username:
                        url = f"https://t.me/{chat.username}"
                        message_text += f"{idx}. {title}\n"
                        buttons.append([InlineKeyboardButton(text=f"📢 {title}", url=url)])
                    else:
                        message_text += f"{idx}. {title} (приватный)\n"

                except TelegramAPIError:
                    message_text += f"{idx}. Канал ID: {channel_id}\n"

            await telegram_bot.send_message(
                chat_id=user_id,
                text=message_text,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None
            )

        except TelegramAPIError as e:
            logger.warning(f"Subscription requirements send failed: {e}")

    async def approve_join_request(self, chat_id: int, user_id: int) -> bool:
        """Одобрить заявку на вступление"""
        try:
            async with get_bot_session() as telegram_bot:
                await telegram_bot.approve_chat_join_request(chat_id=chat_id, user_id=user_id)
                logger.info(f"Approved join request: user={user_id}, chat={chat_id}")
                return True
        except TelegramAPIError as e:
            logger.warning(f"Approve join request failed: {e}")
            return False

