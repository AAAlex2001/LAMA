from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.services.bot.features.captcha.check_answer import CheckCaptchaAnswer
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.callbacks.answer_callback import AnswerCallback
from backend.services.webhook.features.captcha.delete_captcha import DeleteCaptcha
from backend.services.webhook.features.captcha.fire_captcha_result import (
    FireCaptchaResult,
)
from backend.services.webhook.features.captcha.get_captcha import GetCaptcha
from backend.services.webhook.features.captcha.send_captcha_success_text import (
    SendCaptchaSuccessText,
)
from backend.services.webhook.features.captcha.send_captcha_welcome import (
    SendCaptchaWelcome,
)
from backend.services.webhook.features.captcha.unlock_captcha_user import (
    UnlockCaptchaUser,
)


class CheckGroupCaptcha:
    """Обрабатывает callback от group-капчи: правильный ответ → unmute, иначе игнор."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, callback_query: CallbackQuery) -> None:
        captcha = GetCaptcha(self.db).from_callback(callback_query.data, group=True)
        if not captcha:
            return

        is_correct, reason = await CheckCaptchaAnswer(self.db).execute(
            captcha.pending_id,
            captcha.user_answer,
            solver_user_id=callback_query.from_user.id,
        )
        bot = resolve_by_token(self.bot_model.token)
        user_id = callback_query.from_user.id
        chat_id = callback_query.message.chat.id if callback_query.message else 0

        if is_correct:
            await AnswerCallback().execute(
                bot,
                callback_query.id,
                "Правильно. Добро пожаловать!",
            )
            await DeleteCaptcha().execute(bot, callback_query.message)
            await UnlockCaptchaUser().execute(bot, chat_id, user_id)
            await SendCaptchaWelcome(self.db, self.bot_model).execute(callback_query)
            await SendCaptchaSuccessText(self.db, self.bot_model).execute(
                bot,
                chat_id,
                callback_query.from_user,
            )
            await self.fire_result(bot, user_id, chat_id, TriggerType.CAPTCHA_PASSED, captcha.pending_id)
            return

        if reason == "not_allowed":
            await AnswerCallback().execute(
                bot,
                callback_query.id,
                "Эту капчу может решить только приглашенный.",
                True,
            )
            return

        await AnswerCallback().execute(bot, callback_query.id, "Неправильный ответ.", True)
        await self.fire_result(
            bot,
            user_id,
            chat_id,
            TriggerType.CAPTCHA_FAILED,
            captcha.pending_id,
            captcha.user_answer,
        )

    async def fire_result(
        self,
        bot,
        user_id: int,
        chat_id: int,
        trigger_type: TriggerType,
        pending_id: int,
        answer: str | None = None,
    ) -> None:
        await FireCaptchaResult(self.db, self.bot_model).execute(
            bot,
            user_id,
            chat_id,
            trigger_type,
            pending_id,
            "group",
            answer,
        )
