"""
CRUD-операции для триггеров
"""
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import (
    Bot as BotModel,
    Trigger,
    TriggerType,
    TriggerActionType,
    TriggerChatType,
)


async def create_trigger(
    db: AsyncSession,
    bot_id: int,
    name: str,
    trigger_type: TriggerType,
    action_type: TriggerActionType,
    action_data: Optional[Dict[str, Any]] = None,
    delay_minutes: int = 0,
    delivery_window: Optional[Dict[str, Any]] = None,
    filters: Optional[Dict[str, Any]] = None,
    chat_type: Optional[TriggerChatType] = None,
    is_active: bool = True,
    owner_id: Optional[int] = None,
) -> Trigger:
    """Создать триггер"""
    query = select(BotModel).where(BotModel.id == bot_id)
    if owner_id is not None:
        query = query.where(BotModel.owner_id == owner_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise ValueError("Bot not found")

    trigger = Trigger(
        bot_id=bot_id,
        name=name,
        trigger_type=trigger_type,
        action_type=action_type,
        action_data=action_data,
        delay_minutes=delay_minutes,
        delivery_window=delivery_window,
        filters=filters,
        chat_type=chat_type or TriggerChatType.BOTH,
        is_active=is_active,
    )

    db.add(trigger)
    await db.commit()
    await db.refresh(trigger)
    return trigger


async def get_trigger(
    db: AsyncSession,
    trigger_id: int,
    owner_id: Optional[int] = None,
) -> Optional[Trigger]:
    """Получить триггер по ID"""
    query = select(Trigger).where(Trigger.id == trigger_id)
    if owner_id is not None:
        query = query.join(BotModel).where(BotModel.owner_id == owner_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_triggers(
    db: AsyncSession,
    bot_id: int,
    trigger_type: Optional[TriggerType] = None,
    is_active: Optional[bool] = None,
    owner_id: Optional[int] = None,
) -> Tuple[List[Trigger], int]:
    """Получить список триггеров бота"""
    query = select(Trigger).where(Trigger.bot_id == bot_id)

    if owner_id is not None:
        query = query.join(BotModel).where(BotModel.owner_id == owner_id)

    if trigger_type is not None:
        query = query.where(Trigger.trigger_type == trigger_type)

    if is_active is not None:
        query = query.where(Trigger.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Trigger.created_at.desc())
    result = await db.execute(query)
    triggers = list(result.scalars().all())

    return triggers, total


async def update_trigger(
    db: AsyncSession,
    trigger_id: int,
    owner_id: Optional[int] = None,
    **kwargs,
) -> Optional[Trigger]:
    """Обновить триггер"""
    trigger = await get_trigger(db, trigger_id, owner_id)
    if not trigger:
        return None

    for key, value in kwargs.items():
        if hasattr(trigger, key) and value is not None:
            setattr(trigger, key, value)

    trigger.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(trigger)
    return trigger


async def delete_trigger(
    db: AsyncSession,
    trigger_id: int,
    owner_id: Optional[int] = None,
) -> bool:
    """Удалить триггер"""
    trigger = await get_trigger(db, trigger_id, owner_id)
    if not trigger:
        return False

    await db.delete(trigger)
    await db.commit()
    return True


async def get_triggers_for_event(
    db: AsyncSession,
    bot_id: int,
    trigger_type: TriggerType,
) -> List[Trigger]:
    """Получить активные триггеры для события"""
    query = select(Trigger).where(
        Trigger.bot_id == bot_id,
        Trigger.trigger_type == trigger_type,
        Trigger.is_active == True,
    )
    result = await db.execute(query)
    return list(result.scalars().all())
