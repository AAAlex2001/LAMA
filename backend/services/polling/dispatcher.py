"""Polling-диспетчер: забирает обновления для активных ботов и маршрутизирует."""

import asyncio
import logging
from typing import List

from aiogram import Bot
from aiogram.types import Update
from aiogram.exceptions import (
    TelegramRetryAfter,
    TelegramUnauthorizedError,
    TelegramConflictError,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.polling.base import bot_session
from backend.services.polling.message import PollingMessageHandler
from backend.services.polling.callback import PollingCallbackHandler
from backend.services.polling.join_request import PollingJoinRequestHandler

logger = logging.getLogger(__name__)

ALLOWED_UPDATES = ["message", "edited_message", "chat_join_request", "callback_query"]


class PollingDispatcher:
    """
    Диспетчер polling-обновлений.

    Для каждого ACTIVE-бота с is_webhook_enabled=False:
    1. Забирает обновления через getUpdates
    2. Маршрутизирует на хендлеры (message, callback, join_request)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self) -> None:
        """Обработать обновления всех polling-ботов."""
        bots = await self.fetch_active_bots()

        for bot_model in bots:
            try:
                await self.process_bot(bot_model)
            except TelegramRetryAfter as e:
                logger.warning(f"Rate limit {bot_model.username}: {e.retry_after}s")
                await asyncio.sleep(e.retry_after)
            except TelegramConflictError:
                logger.warning(f"Bot {bot_model.username} webhook conflict — deleting webhook")
                async with bot_session(bot_model.token) as tmp:
                    await tmp.delete_webhook(drop_pending_updates=False)
            except TelegramUnauthorizedError:
                logger.error(f"Bot {bot_model.username} unauthorized — setting ERROR")
                bot_model.status = BotStatus.ERROR
                await self.db.commit()
            except Exception as e:
                logger.error(f"Bot {bot_model.username} error: {e}")

    async def fetch_active_bots(self) -> List[BotModel]:
        """Получить всех активных polling-ботов."""
        query = select(BotModel).where(
            BotModel.status == BotStatus.ACTIVE,
            BotModel.is_webhook_enabled == False,
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def process_bot(self, bot_model: BotModel) -> None:
        """Забрать и обработать обновления одного бота."""
        async with bot_session(bot_model.token) as telegram_bot:
            updates: List[Update] = await telegram_bot.get_updates(
                offset=bot_model.last_update_id + 1,
                timeout=0,
                allowed_updates=ALLOWED_UPDATES,
            )

            if not updates:
                return

            for update in updates:
                try:
                    await self.dispatch(bot_model, telegram_bot, update)
                except Exception as e:
                    logger.error(f"Update {update.update_id} error: {e}")
                bot_model.last_update_id = update.update_id

            await self.db.commit()

    async def dispatch(self, bot_model: BotModel, telegram_bot: Bot, update: Update) -> None:
        """Маршрутизация обновления к соответствующему хендлеру."""
        if update.message or update.edited_message:
            message = update.message or update.edited_message
            handler = PollingMessageHandler(self.db, bot_model, telegram_bot)
            await handler.process(message)

        elif update.chat_join_request:
            handler = PollingJoinRequestHandler(self.db, bot_model, telegram_bot)
            await handler.process(update.chat_join_request)

        elif update.callback_query and update.callback_query.data:
            handler = PollingCallbackHandler(self.db, bot_model, telegram_bot)
            await handler.process(update.callback_query)


async def process_bot_updates() -> None:
    """Точка входа для Celery — обработка обновлений всех polling-ботов."""
    async with AsyncSessionLocal() as db:
        try:
            dispatcher = PollingDispatcher(db)
            await dispatcher.run()
        except Exception as e:
            logger.error(f"process_bot_updates error: {e}")
            await db.rollback()
