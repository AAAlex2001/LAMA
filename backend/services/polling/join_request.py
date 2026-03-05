"""Обработчик заявок на вступление polling-ботов."""

import logging
import random
from typing import List

from aiogram import Bot
from aiogram.types import ChatJoinRequest, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, ApprovalMode, CaptchaMode
from backend.services.bot import BotService, CaptchaService
from backend.services.polling.base import approve_join_request
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class PollingJoinRequestHandler:
    """Обработчик заявок на вступление."""

    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot: Bot):
        self.db = db
        self.bot_model = bot_model
        self.bot = telegram_bot

    async def process(self, join_request: ChatJoinRequest) -> None:
        """Обработка заявки на вступление."""
        try:
            user_id = join_request.from_user.id
            bot_service = BotService(self.db)
            should_approve, missing = await bot_service.check_approval_criteria(
                self.bot_model, user_id,
            )

            if self.bot_model.auto_approval_mode == ApprovalMode.MANUAL:
                await self.handle_manual_mode(join_request)
                return

            if self.bot_model.auto_approval_mode == ApprovalMode.CRITERIA and not should_approve:
                if missing:
                    await self.send_subscription_requirements(user_id, missing)
                return

            if should_approve:
                await approve_join_request(join_request.chat.id, user_id)

        except Exception as e:
            logger.error(f"Join request error: {e}", exc_info=True)

    async def handle_manual_mode(self, join_request: ChatJoinRequest) -> None:
        """MANUAL режим — отправка капчи в ЛС если включена."""
        captcha_mode = getattr(self.bot_model, "captcha_mode", CaptchaMode.DISABLED)

        if captcha_mode not in (CaptchaMode.JOIN_REQUEST, CaptchaMode.BOTH):
            return

        await self.send_captcha(join_request)

    async def send_captcha(self, join_request: ChatJoinRequest) -> None:
        """Отправить капчу пользователю в ЛС."""
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

            correct = int(answer)
            options = {correct}
            while len(options) < 3:
                options.add(correct + random.randint(1, 4))

            options_list = list(options)
            random.shuffle(options_list)

            buttons_data = [[{
                "text": str(opt),
                "callback_data": f"captcha_{pending.id}_{opt}",
            }] for opt in options_list]

            await self.bot.send_message(
                chat_id=join_request.from_user.id,
                text=question,
                reply_markup=build_keyboard(buttons_data),
            )

        except TelegramAPIError as e:
            logger.warning(f"Captcha send failed: {e}")

    async def send_subscription_requirements(self, user_id: int, missing_channels: List[int]) -> None:
        """Отправить список каналов для подписки."""
        try:
            text = "📢 Для вступления подпишитесь на каналы:\n\n"
            buttons = []

            for idx, channel_id in enumerate(missing_channels, 1):
                try:
                    chat = await self.bot.get_chat(channel_id)
                    title = chat.title or f"Канал {idx}"

                    if chat.username:
                        text += f"{idx}. {title}\n"
                        buttons.append([InlineKeyboardButton(text=f"📢 {title}", url=f"https://t.me/{chat.username}")])
                    else:
                        text += f"{idx}. {title} (приватный)\n"
                except TelegramAPIError:
                    text += f"{idx}. Канал ID: {channel_id}\n"

            text += "\n✅ После подписки подайте заявку снова!"

            await self.bot.send_message(
                chat_id=user_id,
                text=text,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None,
            )

        except TelegramAPIError as e:
            logger.warning(f"Subscription requirements send failed: {e}")
