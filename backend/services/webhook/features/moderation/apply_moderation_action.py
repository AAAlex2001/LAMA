import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ActionType
from backend.models.bots import Bot as BotModel
from backend.celery.telegram_tasks import TELEGRAM_MODERATION_TASK
from backend.services.telegram_jobs import CeleryJob, enqueue_after_commit
from backend.services.webhook.features.moderation.create_moderation_event import (
    CreateModerationEvent,
)

logger = logging.getLogger(__name__)


class ApplyModerationAction:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        message: Message,
        action: ActionType | None,
        mute_duration: int | None,
        channel,
        reason: str | None = None,
        reason_source: str | None = None,
        reason_context: dict | None = None,
    ) -> bool:
        if not action:
            return False

        try:
            await CreateModerationEvent(self.db, self.bot_model).execute(
                message=message,
                channel=channel,
                action=action,
                mute_duration=mute_duration,
                reason=reason,
                reason_source=reason_source,
                reason_context=reason_context,
            )
            self.enqueue_telegram_action(message, action, mute_duration)
            return True

        except Exception as exc:
            logger.error("Failed to apply moderation action: %s", exc, exc_info=True)
            raise
        return False

    def enqueue_telegram_action(
        self,
        message: Message,
        action: ActionType,
        mute_duration: int | None,
    ) -> None:
        user_id = message.from_user.id if message.from_user else None
        enqueue_after_commit(
            self.db,
            CeleryJob(
                task_name=TELEGRAM_MODERATION_TASK,
                args=(
                    self.bot_model.id,
                    message.chat.id,
                    message.message_id,
                    user_id,
                    action.value,
                    mute_duration,
                ),
                queue="telegram",
                idempotency_key=(
                    "lama:telegram-job:moderation:"
                    f"{self.bot_model.id}:{message.chat.id}:{message.message_id}:{action.value}"
                ),
                idempotency_ttl_seconds=900,
            ),
        )
