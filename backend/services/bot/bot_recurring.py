from fastapi import HTTPException
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import pytz
from aiogram import Bot
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import (
    RecurringMessage, RecurringMessageLog,
    RecurringMessageInterval, Bot as BotModel,
)
from backend.schemas.bots import RecurringMessageCreate, RecurringMessageUpdate
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)

MEDIA_SEND_METHODS = {
    "PHOTO": "send_photo",
    "VIDEO": "send_video",
    "DOCUMENT": "send_document",
}


class BotRecurringService:
    """Повторяющиеся сообщения бота."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, bot_id: int, data: RecurringMessageCreate, owner_id: int) -> RecurringMessage:
        """Создать повторяющееся сообщение."""
        await self.ensure_bot_for_owner(bot_id, owner_id)

        msg = RecurringMessage(
            bot_id=bot_id, name=data.name,
            text_content=data.text_content, media_url=data.media_url,
            media_type=data.media_type, inline_buttons=data.inline_buttons,
            target_chats=data.target_chats, interval_type=data.interval_type,
            interval_value=data.interval_value, time_points=data.time_points,
            timezone=data.timezone, start_date=data.start_date,
            end_date=data.end_date, weekdays=data.weekdays,
            is_active=data.is_active,
        )
        msg.next_send_at = self.calculate_next_send(msg)
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def update(self, message_id: int, data: RecurringMessageUpdate, owner_id: int) -> RecurringMessage:
        """Обновить повторяющееся сообщение."""
        msg = await self.get_for_owner(message_id, owner_id)
        if not msg:
            raise HTTPException(status_code=400, detail="Сообщение не найдено")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(msg, field, value)

        msg.next_send_at = self.calculate_next_send(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def delete(self, message_id: int, owner_id: int) -> bool:
        """Удалить повторяющееся сообщение."""
        msg = await self.get_for_owner(message_id, owner_id)
        if not msg:
            raise HTTPException(status_code=400, detail="Сообщение не найдено")
        await self.db.delete(msg)
        await self.db.flush()
        return True

    async def get(self, message_id: int, owner_id: int) -> Optional[RecurringMessage]:
        """Получить сообщение по ID."""
        return await self.get_for_owner(message_id, owner_id)

    async def list(self, bot_id: int, owner_id: int, skip: int = 0, limit: int = 100) -> Tuple[List[RecurringMessage], int]:
        """Список сообщений бота."""
        await self.ensure_bot_for_owner(bot_id, owner_id)

        base = select(RecurringMessage).where(RecurringMessage.bot_id == bot_id)
        total = (await self.db.execute(
            select(func.count()).select_from(base.subquery())
        )).scalar() or 0

        result = await self.db.execute(
            base.order_by(RecurringMessage.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_pending(self, limit: int = 50) -> List[RecurringMessage]:
        """Получить сообщения готовые к отправке."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(RecurringMessage).where(
                and_(
                    RecurringMessage.is_active == True,
                    RecurringMessage.next_send_at <= now,
                    or_(RecurringMessage.start_date.is_(None), RecurringMessage.start_date <= now),
                    or_(RecurringMessage.end_date.is_(None), RecurringMessage.end_date >= now),
                )
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def send(self, msg: RecurringMessage, telegram_bot: Bot) -> None:
        """Отправить сообщение во все целевые чаты."""
        now = datetime.now(timezone.utc)

        if msg.end_date and now > msg.end_date:
            msg.is_active = False
            await self.db.flush()
            return

        if msg.weekdays:
            tz = pytz.timezone(msg.timezone)
            if datetime.now(tz).weekday() not in msg.weekdays:
                msg.next_send_at = self.calculate_next_send(msg)
                await self.db.flush()
                return

        keyboard = build_keyboard(msg.inline_buttons)
        text = ShortcodeProcessor.replace_datetime(msg.text_content or "")

        await asyncio.gather(
            *(self.send_to_chat(telegram_bot, chat_id, msg, text, keyboard)
              for chat_id in msg.target_chats),
            return_exceptions=True,
        )

        msg.last_sent_at = now
        msg.next_send_at = self.calculate_next_send(msg)
        await self.db.flush()

    async def send_to_chat(self, bot: Bot, chat_id: int, msg: RecurringMessage, text: str, keyboard) -> None:
        """Отправить в один чат и залогировать."""
        telegram_message_id = None
        success = True
        error = None

        try:
            media_type = msg.media_type.value if msg.media_type else None
            if msg.media_url and media_type and media_type in MEDIA_SEND_METHODS:
                method = getattr(bot, MEDIA_SEND_METHODS[media_type])
                result = await method(chat_id, msg.media_url, caption=text, reply_markup=keyboard)
            else:
                result = await bot.send_message(chat_id, text or "", reply_markup=keyboard)
            telegram_message_id = result.message_id
        except Exception as e:
            success = False
            error = str(e)
            logger.error(f"Ошибка отправки в чат {chat_id}: {e}")

        self.db.add(RecurringMessageLog(
            recurring_message_id=msg.id, chat_id=chat_id,
            telegram_message_id=telegram_message_id,
            success=success, error_message=error,
        ))

    def calculate_next_send(self, msg: RecurringMessage) -> datetime:
        """Рассчитать следующее время отправки."""
        tz = pytz.timezone(msg.timezone)
        now = datetime.now(tz)
        time_points = sorted(msg.time_points)

        for time_str in time_points:
            hour, minute = map(int, time_str.split(":"))
            candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if candidate > now:
                if msg.weekdays and candidate.weekday() not in msg.weekdays:
                    continue
                return candidate.astimezone(timezone.utc)

        next_date = self.calculate_next_date(msg, now)
        hour, minute = map(int, time_points[0].split(":"))
        return next_date.replace(hour=hour, minute=minute, second=0, microsecond=0).astimezone(timezone.utc)

    def calculate_next_date(self, msg: RecurringMessage, current: datetime) -> datetime:
        """Рассчитать следующую дату по типу интервала."""
        interval = msg.interval_type

        if interval == RecurringMessageInterval.HOURLY:
            return current + timedelta(hours=1)

        if interval == RecurringMessageInterval.DAILY:
            return current + timedelta(days=1)

        if interval == RecurringMessageInterval.WEEKLY:
            return self.next_weekly_date(current, msg.weekdays)

        if interval == RecurringMessageInterval.MONTHLY:
            year, month = (current.year + 1, 1) if current.month == 12 else (current.year, current.month + 1)
            return current.replace(year=year, month=month)

        if interval == RecurringMessageInterval.CUSTOM and msg.interval_value:
            return current + timedelta(minutes=msg.interval_value)

        return current + timedelta(days=1)

    def next_weekly_date(self, current: datetime, weekdays: Optional[list]) -> datetime:
        """Найти следующий день недели."""
        if not weekdays:
            return current + timedelta(weeks=1)

        current_wd = current.weekday()
        upcoming = [d for d in weekdays if d > current_wd]
        days_ahead = (min(upcoming) - current_wd) if upcoming else (7 - current_wd + min(weekdays))
        return current + timedelta(days=days_ahead)

    async def ensure_bot_for_owner(self, bot_id: int, owner_id: int) -> None:
        """Проверить что бот принадлежит владельцу."""
        result = await self.db.execute(
            select(BotModel).where(and_(BotModel.id == bot_id, BotModel.owner_id == owner_id))
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Бот не найден")

    async def get_for_owner(self, message_id: int, owner_id: int) -> Optional[RecurringMessage]:
        """Получить сообщение для владельца."""
        result = await self.db.execute(
            select(RecurringMessage).join(BotModel).where(
                and_(RecurringMessage.id == message_id, BotModel.owner_id == owner_id)
            )
        )
        return result.scalar_one_or_none()
