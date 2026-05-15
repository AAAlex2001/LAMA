import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, TriggerType
from backend.services.bot.features.triggers.fire.fire_event import FireTriggerEvent

logger = logging.getLogger(__name__)


class FireCaptchaResult:
    """Выстреливает CAPTCHA_PASSED/FAILED триггеры бота."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.bot_model = bot_model
        self.fire_event = FireTriggerEvent(db)

    async def execute(
        self,
        bot,
        user_id: int,
        chat_id: int,
        trigger_type: TriggerType,
        pending_id: int,
        chat_type: str,
        answer: str | None = None,
    ) -> None:
        context = {"pending_id": pending_id}
        if chat_type == "group":
            context["group_captcha"] = True
        if answer:
            context["answer"] = answer

        try:
            await self.fire_event.execute(
                bot_id=self.bot_model.id,
                trigger_type=trigger_type,
                user_id=user_id,
                chat_id=chat_id,
                telegram_bot=bot,
                chat_type=chat_type,
                context=context,
            )
        except Exception as exc:
            logger.error("Failed to fire %s trigger: %s", trigger_type.value, exc)
