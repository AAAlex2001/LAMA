import logging
import random

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatJoinRequest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.services.bot.features.captcha.create_pending import CreatePendingApproval
from backend.services.bot.features.captcha.generate_captcha import generate_captcha
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class SendJoinCaptcha:
    """Отправляет captcha-сообщение в личку при join-request."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, telegram_bot, join_request: ChatJoinRequest) -> None:
        try:
            question, answer = generate_captcha()
            pending = await CreatePendingApproval(self.db).execute(
                bot_id=self.bot_model.id,
                user_id=join_request.from_user.id,
                chat_id=join_request.chat.id,
                question=question,
                answer=answer,
            )
            options = self.get_answer_options(answer)
            buttons = [
                [{"text": str(option), "callback_data": f"captcha_{pending.id}_{option}"}]
                for option in options
            ]
            await telegram_bot.send_message(
                chat_id=join_request.from_user.id,
                text=question,
                reply_markup=build_keyboard(buttons),
            )
            logger.info("Captcha sent to %s", join_request.from_user.id)
        except TelegramAPIError as exc:
            logger.warning("Captcha send failed: %s", exc)

    @staticmethod
    def get_answer_options(answer: str) -> list[int]:
        correct = int(answer)
        options = {correct}
        while len(options) < 3:
            options.add(correct + random.randint(1, 4))

        result = list(options)
        random.shuffle(result)
        return result
