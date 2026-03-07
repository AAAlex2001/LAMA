"""
Обработчик подписок на каналы
"""

import asyncio
import logging

from aiogram.types import ChatMemberUpdated
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import TriggerService
from backend.models.bots import (
    Bot as BotModel,
    PendingJoinApproval,
    TriggerType,
)
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT

logger = logging.getLogger(__name__)


class SubscriptionHandler:
    """Обработчик подписок на каналы"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)

    async def process(self, chat_member: ChatMemberUpdated) -> None:
        """Обработка изменения статуса участника канала"""
        new_status = chat_member.new_chat_member.status

        user_id = chat_member.from_user.id
        channel_id = chat_member.chat.id

        # Пользователь подписался на канал
        if new_status in {"member", "administrator", "creator"}:
            await self.handle_subscription(chat_member, user_id, channel_id)

        # Пользователь отписался от канала (можно добавить триггер если нужно)
        # if new_status in {"left", "kicked"}:
        #     pass

    async def handle_subscription(
        self, chat_member: ChatMemberUpdated, user_id: int, channel_id: int
    ) -> None:
        """Обработка подписки на канал"""
        try:
            # Получаем все pending для пользователя одним запросом
            query = select(PendingJoinApproval).where(
                PendingJoinApproval.user_id == user_id
            )
            result = await self.db.execute(query)
            pendings = list(result.scalars().all())

            if not pendings:
                return

            # Обрабатываем все pending батчем
            approved_pendings = []

            for pending in pendings:
                if channel_id not in pending.missing_channels:
                    continue

                # Убираем канал из списка
                pending.missing_channels.remove(channel_id)

                # Если все каналы подписаны - добавляем в список на одобрение
                if not pending.missing_channels:
                    approved_pendings.append(pending)

            # Одобряем все заявки батчем
            if approved_pendings:
                async with get_bot_session(
                    self.bot_model.token
                ) as telegram_bot:
                    for pending in approved_pendings:
                        try:
                            await asyncio.wait_for(
                                telegram_bot.approve_chat_join_request(
                                    chat_id=pending.chat_id,
                                    user_id=pending.user_id,
                                ),
                                timeout=TELEGRAM_API_TIMEOUT,
                            )

                            # Триггер JOIN_REQUEST_APPROVED
                            await self.trigger_service.fire_event(
                                bot_id=self.bot_model.id,
                                trigger_type=TriggerType.JOIN_REQUEST_APPROVED,
                                user_id=pending.user_id,
                                chat_id=pending.chat_id,
                                telegram_bot=telegram_bot,
                                chat_type="private",
                                context={
                                    "auto_approved": True,
                                    "channel_id": channel_id,
                                },
                            )

                        except (TelegramAPIError, asyncio.TimeoutError) as e:
                            logger.warning(
                                f"Failed to approve join request: {e}"
                            )

                        # Удаляем обработанный pending
                        await self.db.delete(pending)

            # Коммитим все изменения одной транзакцией
            await self.db.commit()

        except Exception as e:
            logger.error(f"Subscription processing error: {e}", exc_info=True)
            await self.db.rollback()
