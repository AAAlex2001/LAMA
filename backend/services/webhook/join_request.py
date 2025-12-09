"""
Обработчик заявок на вступление
"""
import logging

from aiogram.types import ChatJoinRequest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import BotService
from backend.services.bot.triggers import TriggerService
from backend.models.bots import Bot as BotModel, PendingJoinApproval, TriggerType
from backend.tasks.bot_polling import handle_join_request
from backend.services.webhook.base import get_bot_session

logger = logging.getLogger(__name__)


class JoinRequestHandler:
    """Обработчик заявок на вступление"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.bot_service = BotService(db)
        self.trigger_service = TriggerService(db)

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

                # Обработка заявки (одобрение/отклонение)
                approved = await handle_join_request(
                    self.bot_service,
                    self.bot_model,
                    telegram_bot,
                    join_request
                )

                # Триггер JOIN_REQUEST_APPROVED или JOIN_REQUEST_REJECTED
                if approved:
                    await self.trigger_service.fire_event(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                        user_id=user_id,
                        chat_id=chat_id,
                        telegram_bot=telegram_bot,
                        context={
                            "username": join_request.from_user.username,
                            "first_name": join_request.from_user.first_name,
                        }
                    )
                else:
                    await self.trigger_service.fire_event(
                        bot_id=self.bot_model.id,
                        trigger_type=TriggerType.JOIN_REQUEST_REJECTED,
                        user_id=user_id,
                        chat_id=chat_id,
                        telegram_bot=telegram_bot,
                        context={
                            "username": join_request.from_user.username,
                            "first_name": join_request.from_user.first_name,
                            "missing_channels": missing,
                        }
                    )

        except Exception as e:
            logger.error(f"Join request error: {e}", exc_info=True)

