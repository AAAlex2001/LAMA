"""
Главный сервис триггеров
"""
from typing import Optional, List, Tuple, Dict, Any
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot

from backend.models.bots import (
    Trigger,
    ScheduledTriggerTask,
    TriggerType,
    TriggerActionType,
    TriggerChatType,
)
from backend.services.bot.triggers import crud, filters, executor, scheduler

logger = logging.getLogger(__name__)


class TriggerService:
    """Сервис для работы с триггерами"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # CRUD операции (делегируем в crud.py)
    # ========================================================================

    async def create_trigger(
        self,
        bot_id: int,
        name: str,
        trigger_type: TriggerType,
        action_type: TriggerActionType,
        action_data: Optional[Dict[str, Any]] = None,
        delay_minutes: int = 0,
        delivery_window: Optional[Dict[str, Any]] = None,
        filters_data: Optional[Dict[str, Any]] = None,
        chat_type: Optional[TriggerChatType] = None,
        is_active: bool = True,
        owner_id: Optional[int] = None,
    ) -> Trigger:
        """Создать триггер"""
        return await crud.create_trigger(
            self.db,
            bot_id=bot_id,
            name=name,
            trigger_type=trigger_type,
            action_type=action_type,
            action_data=action_data,
            delay_minutes=delay_minutes,
            delivery_window=delivery_window,
            filters=filters_data,
            chat_type=chat_type,
            is_active=is_active,
            owner_id=owner_id,
        )

    async def get_trigger(
        self,
        trigger_id: int,
        owner_id: Optional[int] = None,
    ) -> Optional[Trigger]:
        """Получить триггер по ID"""
        return await crud.get_trigger(self.db, trigger_id, owner_id)

    async def get_triggers(
        self,
        bot_id: int,
        trigger_type: Optional[TriggerType] = None,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[Trigger], int]:
        """Получить список триггеров бота"""
        return await crud.get_triggers(
            self.db,
            bot_id=bot_id,
            trigger_type=trigger_type,
            is_active=is_active,
            owner_id=owner_id,
        )

    async def update_trigger(
        self,
        trigger_id: int,
        owner_id: Optional[int] = None,
        **kwargs,
    ) -> Optional[Trigger]:
        """Обновить триггер"""
        return await crud.update_trigger(self.db, trigger_id, owner_id, **kwargs)

    async def delete_trigger(
        self,
        trigger_id: int,
        owner_id: Optional[int] = None,
    ) -> bool:
        """Удалить триггер"""
        return await crud.delete_trigger(self.db, trigger_id, owner_id)

    # ========================================================================
    # Обработка событий
    # ========================================================================

    async def get_triggers_for_event(
        self,
        bot_id: int,
        trigger_type: TriggerType,
    ) -> List[Trigger]:
        """Получить активные триггеры для события"""
        return await crud.get_triggers_for_event(self.db, bot_id, trigger_type)

    async def fire_event(
        self,
        bot_id: int,
        trigger_type: TriggerType,
        user_id: int,
        chat_id: int,
        telegram_bot: Bot,
        context: Optional[Dict[str, Any]] = None,
        chat_type: Optional[str] = None,
    ) -> int:
        """
        Запустить обработку события.
        Возвращает количество сработавших триггеров.
        chat_type: 'private', 'group', 'supergroup', 'channel'
        """
        triggers = await self.get_triggers_for_event(bot_id, trigger_type)
        executed = 0

        for trigger in triggers:
            if not filters.check_chat_type(trigger, chat_type):
                continue

            if not filters.check_filters(trigger, user_id, chat_id, context):
                continue

            if trigger.delay_minutes > 0:
                await scheduler.schedule_trigger(self.db, trigger, user_id, chat_id, context)
                executed += 1
                continue

            try:
                await self.execute_trigger(trigger, user_id, chat_id, telegram_bot, context)
                executed += 1
            except Exception as e:
                logger.error(f"Trigger {trigger.id} execution failed: {e}")

        return executed

    async def execute_trigger(
        self,
        trigger: Trigger,
        user_id: int,
        chat_id: int,
        telegram_bot: Bot,
        context: Optional[dict] = None,
    ):
        """Выполнить действие триггера"""
        if not filters.check_delivery_window(trigger):
            await scheduler.schedule_for_next_window(self.db, trigger, user_id, chat_id, context)
            return

        action_data = trigger.action_data
        if not isinstance(action_data, dict):
            action_data = {}
        action_data["context"] = context or {}

        target_chat_id = chat_id
        if trigger.trigger_type in (
            TriggerType.JOIN_REQUEST_CREATED,
            TriggerType.JOIN_REQUEST_APPROVED,
            TriggerType.JOIN_REQUEST_REJECTED,
        ):
            target_chat_id = user_id

        if trigger.action_type == TriggerActionType.SEND_MESSAGE:
            await executor.send_message(telegram_bot, target_chat_id, user_id, action_data)

        elif trigger.action_type == TriggerActionType.SEND_MEDIA:
            await executor.send_media(telegram_bot, target_chat_id, user_id, action_data)

        elif trigger.action_type == TriggerActionType.MUTE_USER:
            await executor.mute_user(telegram_bot, chat_id, user_id, action_data)

        elif trigger.action_type == TriggerActionType.BAN_USER:
            await executor.ban_user(telegram_bot, chat_id, user_id, action_data)

    # ========================================================================
    # Обработка отложенных триггеров
    # ========================================================================

    async def get_pending_tasks(self, limit: int = 100) -> List[ScheduledTriggerTask]:
        """Получить задачи, готовые к выполнению"""
        return await scheduler.get_pending_tasks(self.db, limit)

    async def execute_scheduled_task(
        self,
        task: ScheduledTriggerTask,
        telegram_bot: Bot,
    ) -> bool:
        """Выполнить отложенную задачу"""
        return await scheduler.execute_scheduled_task(
            self.db,
            task,
            telegram_bot,
            self.execute_trigger,
        )
