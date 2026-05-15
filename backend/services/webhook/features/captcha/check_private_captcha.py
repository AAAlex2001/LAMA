"""Проверка приватной (ЛС-) капчи через callback-кнопку."""

from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.services.bot.features.captcha.check_answer import CheckCaptchaAnswer
from backend.services.bot_provider import resolve_by_token
from backend.services.webhook.features.callbacks.answer_callback import AnswerCallback
from backend.services.webhook.features.captcha.approve_pending_join_request import (
    ApprovePendingJoinRequest,
)
from backend.services.webhook.features.captcha.fire_captcha_result import (
    FireCaptchaResult,
)
from backend.services.webhook.features.captcha.get_captcha import GetCaptcha
from backend.services.webhook.features.captcha.update_captcha_invite_member_count import (
    UpdateCaptchaInviteMemberCount,
)
from backend.services.webhook.features.subscriptions.mark_join_request_accepted import (
    MarkJoinRequestAccepted,
)


class CheckPrivateCaptcha:
    """Проверяет ответ на капчу в личке: одобряет join-request если правильно, иначе бросает фейл-событие."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(self, callback_query: CallbackQuery) -> None:
        captcha = GetCaptcha(self.db).from_callback(callback_query.data)
        if not captcha:
            return

        is_correct, reason = await CheckCaptchaAnswer(self.db).execute(
            captcha.pending_id,
            captcha.user_answer,
            solver_user_id=callback_query.from_user.id,
        )
        bot = resolve_by_token(self.bot_model.token)
        user_id = callback_query.from_user.id
        chat_id = await GetCaptcha(self.db).get_chat_id(captcha.pending_id)

        if is_correct:
            await AnswerCallback().execute(
                bot,
                callback_query.id,
                "Правильно. Заявка одобрена.",
                True,
            )
            pending = await ApprovePendingJoinRequest(self.db).execute(bot, captcha.pending_id)
            if pending:
                await UpdateCaptchaInviteMemberCount(self.db, self.bot_model).execute(
                    pending.user_id,
                    pending.chat_id,
                )
                await MarkJoinRequestAccepted(self.db).execute(
                    pending.user_id,
                    pending.chat_id,
                )
                chat_id = pending.chat_id
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
            "supergroup",
            answer,
        )
