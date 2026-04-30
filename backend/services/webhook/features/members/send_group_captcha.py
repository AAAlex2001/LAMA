import logging
import random

from aiogram.types import Message, User
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.celery.tasks import captcha_timeout_check
from backend.models.bots import Bot as BotModel, PendingApproval
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.bot.features.captcha.create_pending import CreatePendingApproval
from backend.services.bot.features.captcha.generate_captcha import generate_captcha
from backend.services.webhook.features.members.get_captcha_restriction import (
    GetCaptchaRestriction,
)
from backend.utils import build_keyboard

logger = logging.getLogger(__name__)


class SendGroupCaptcha:
    def __init__(self, db: AsyncSession, bot_model: BotModel, telegram_bot):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot

    async def execute(self, message: Message, new_member: User, channel=None) -> None:
        if message.chat.type != "supergroup":
            logger.info(
                "Captcha skipped: chat %s is %s, not supergroup",
                message.chat.id,
                message.chat.type,
            )
            return

        try:
            await self.reject_previous_pending(new_member.id)
            question, answer = generate_captcha()
            pending = await CreatePendingApproval(self.db).execute(
                bot_id=self.bot_model.id,
                user_id=new_member.id,
                chat_id=message.chat.id,
                question=question,
                answer=answer,
            )
            await self.restrict_member(message, new_member, channel)
            timeout_seconds = self.get_timeout_seconds(channel)
            captcha_message = await self.telegram_bot.send_message(
                chat_id=message.chat.id,
                text=self.get_captcha_text(new_member, channel, question, timeout_seconds),
                reply_markup=build_keyboard(self.get_buttons(pending.id, answer)),
            )
            captcha_timeout_check.apply_async(
                args=[
                    self.bot_model.id,
                    message.chat.id,
                    new_member.id,
                    captcha_message.message_id,
                    pending.id,
                ],
                countdown=timeout_seconds + 1,
            )
        except Exception as exc:
            logger.error("Failed to send group captcha: %s", exc, exc_info=True)

    async def reject_previous_pending(self, user_id: int) -> None:
        await self.db.execute(
            update(PendingApproval)
            .where(
                PendingApproval.bot_id == self.bot_model.id,
                PendingApproval.user_id == user_id,
                PendingApproval.is_approved.is_(False),
                PendingApproval.is_rejected.is_(False),
            )
            .values(is_rejected=True)
        )
        await self.db.flush()

    async def restrict_member(self, message: Message, new_member: User, channel) -> None:
        try:
            await self.telegram_bot.restrict_chat_member(
                chat_id=message.chat.id,
                user_id=new_member.id,
                permissions=GetCaptchaRestriction().execute(channel),
                use_independent_chat_permissions=True,
            )
        except Exception as exc:
            logger.error("Failed to restrict member %s: %s", new_member.id, exc, exc_info=True)

    @staticmethod
    def get_buttons(pending_id: int, answer: str) -> list[list[dict]]:
        correct = int(answer)
        options = {correct}
        while len(options) < 3:
            options.add(correct + random.randint(-5, 5))
            if len(options) >= 10:
                break

        option_list = list(options)[:3]
        random.shuffle(option_list)
        return [
            [{"text": str(option), "callback_data": f"group_captcha_{pending_id}_{option}"}]
            for option in option_list
        ]

    def get_timeout_seconds(self, channel) -> int:
        if channel:
            return channel.captcha_timeout_seconds or 30
        return getattr(self.bot_model, "captcha_timeout_seconds", 10)

    @staticmethod
    def get_captcha_text(
        new_member: User,
        channel,
        question: str,
        timeout_seconds: int,
    ) -> str:
        shortcode_context = {
            "user": {
                "first_name": new_member.first_name or "",
                "username": new_member.username or "",
                "last_name": new_member.last_name or "",
                "id": new_member.id,
            },
        }
        custom_before = channel.captcha_message_before if channel else None
        if custom_before:
            return f"{ShortcodeProcessor.process(custom_before, shortcode_context)}\n\n{question}"

        return (
            f"{new_member.first_name}, реши капчу за {timeout_seconds} секунд, "
            f"иначе будешь удален.\n\n{question}"
        )
