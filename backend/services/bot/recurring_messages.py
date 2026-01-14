"""
Сервис повторяющихся сообщений для ботов
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
import pytz

from aiogram import Bot
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import (
    RecurringMessage,
    RecurringMessageLog,
    RecurringMessageInterval,
    Bot as BotModel
)
from backend.schemas.bots import RecurringMessageCreate, RecurringMessageUpdate
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)


class RecurringMessageService:
    """Сервис управления повторяющимися сообщениями"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        bot_id: int,
        data: RecurringMessageCreate,
        owner_id: int
    ) -> RecurringMessage:
        """Создать повторяющееся сообщение"""
        bot = await self.get_bot_for_owner(bot_id, owner_id)
        if not bot:
            raise ValueError("Бот не найден")

        recurring_msg = RecurringMessage(
            bot_id=bot_id,
            name=data.name,
            text_content=data.text_content,
            media_url=data.media_url,
            media_type=data.media_type,
            inline_buttons=data.inline_buttons,
            target_chats=data.target_chats,
            interval_type=data.interval_type,
            interval_value=data.interval_value,
            time_points=data.time_points,
            timezone=data.timezone,
            start_date=data.start_date,
            end_date=data.end_date,
            weekdays=data.weekdays,
            is_active=data.is_active
        )

        recurring_msg.next_send_at = self.calculate_next_send(recurring_msg)

        self.db.add(recurring_msg)
        await self.db.commit()
        await self.db.refresh(recurring_msg)

        return recurring_msg

    async def update(
        self,
        message_id: int,
        data: RecurringMessageUpdate,
        owner_id: int
    ) -> RecurringMessage:
        """Обновить повторяющееся сообщение"""
        recurring_msg = await self.get_for_owner(message_id, owner_id)
        if not recurring_msg:
            raise ValueError("Сообщение не найдено")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(recurring_msg, field, value)

        recurring_msg.next_send_at = self.calculate_next_send(recurring_msg)

        await self.db.commit()
        await self.db.refresh(recurring_msg)

        return recurring_msg

    async def delete(self, message_id: int, owner_id: int) -> bool:
        """Удалить повторяющееся сообщение"""
        recurring_msg = await self.get_for_owner(message_id, owner_id)
        if not recurring_msg:
            raise ValueError("Сообщение не найдено")

        await self.db.delete(recurring_msg)
        await self.db.commit()
        return True

    async def get(self, message_id: int, owner_id: int) -> Optional[RecurringMessage]:
        """Получить сообщение по ID"""
        return await self.get_for_owner(message_id, owner_id)

    async def list(
        self,
        bot_id: int,
        owner_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[RecurringMessage], int]:
        """Список сообщений бота"""
        bot = await self.get_bot_for_owner(bot_id, owner_id)
        if not bot:
            raise ValueError("Бот не найден")

        query = select(RecurringMessage).where(
            RecurringMessage.bot_id == bot_id
        ).order_by(RecurringMessage.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        messages = list(result.scalars().all())

        count_query = select(func.count()).select_from(RecurringMessage).where(
            RecurringMessage.bot_id == bot_id
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return messages, total

    async def get_pending(self, limit: int = 50) -> List[RecurringMessage]:
        """Получить сообщения готовые к отправке"""
        now = datetime.now(timezone.utc)

        query = select(RecurringMessage).where(
            and_(
                RecurringMessage.is_active == True,
                RecurringMessage.next_send_at <= now,
                or_(
                    RecurringMessage.start_date.is_(None),
                    RecurringMessage.start_date <= now
                ),
                or_(
                    RecurringMessage.end_date.is_(None),
                    RecurringMessage.end_date >= now
                )
            )
        ).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def send_message(self, recurring_msg: RecurringMessage, telegram_bot: Bot) -> None:
        """Отправить сообщение во все целевые чаты"""
        now = datetime.now(timezone.utc)

        # Проверка временных рамок
        if recurring_msg.end_date and now > recurring_msg.end_date:
            recurring_msg.is_active = False
            await self.db.commit()
            return

        # Проверка дня недели
        if recurring_msg.weekdays:
            tz = pytz.timezone(recurring_msg.timezone)
            current_weekday = datetime.now(tz).weekday()
            if current_weekday not in recurring_msg.weekdays:
                recurring_msg.next_send_at = self.calculate_next_send(
                    recurring_msg)
                await self.db.commit()
                return

        keyboard = build_keyboard(recurring_msg.inline_buttons)
        text = self.process_shortcodes(recurring_msg.text_content or "")

        for chat_id in recurring_msg.target_chats:
            await self.send_to_chat(telegram_bot, chat_id, recurring_msg, text, keyboard)

        recurring_msg.last_sent_at = now
        recurring_msg.next_send_at = self.calculate_next_send(recurring_msg)
        await self.db.commit()

    async def send_to_chat(self, bot: Bot, chat_id: int, msg: RecurringMessage, text: str, keyboard) -> None:
        """Отправить в один чат"""
        telegram_message_id = None
        success = True
        error = None

        try:
            if msg.media_url and msg.media_type:
                media_type = msg.media_type.value

                if media_type == "PHOTO":
                    result = await bot.send_photo(chat_id, msg.media_url, caption=text, reply_markup=keyboard)
                elif media_type == "VIDEO":
                    result = await bot.send_video(chat_id, msg.media_url, caption=text, reply_markup=keyboard)
                elif media_type == "DOCUMENT":
                    result = await bot.send_document(chat_id, msg.media_url, caption=text, reply_markup=keyboard)
                else:
                    result = await bot.send_message(chat_id, text or "📢", reply_markup=keyboard)
            else:
                result = await bot.send_message(chat_id, text or "📢", reply_markup=keyboard)

            telegram_message_id = result.message_id

        except Exception as e:
            success = False
            error = str(e)
            logger.error(f"Ошибка отправки в чат {chat_id}: {e}")

        log = RecurringMessageLog(
            recurring_message_id=msg.id,
            chat_id=chat_id,
            telegram_message_id=telegram_message_id,
            success=success,
            error_message=error
        )
        self.db.add(log)

    def process_shortcodes(self, text: str) -> str:
        """Обработка шорткодов"""
        if not text:
            return text

        now = datetime.now()

        text = text.replace('{date}', now.strftime('%d.%m.%Y'))
        text = text.replace('{time}', now.strftime('%H:%M'))
        text = text.replace('{datetime}', now.strftime('%d.%m.%Y %H:%M'))
        text = text.replace('{year}', str(now.year))
        text = text.replace('{month}', str(now.month))
        text = text.replace('{day}', str(now.day))

        return text

    def calculate_next_send(self, msg: RecurringMessage) -> datetime:
        """Рассчитать следующее время отправки"""
        tz = pytz.timezone(msg.timezone)
        now = datetime.now(tz)

        time_points = sorted(msg.time_points)

        # Ищем следующую точку сегодня
        for time_str in time_points:
            hour, minute = map(int, time_str.split(':'))
            next_time = now.replace(
                hour=hour, minute=minute, second=0, microsecond=0)

            if next_time > now:
                if msg.weekdays and next_time.weekday() not in msg.weekdays:
                    continue
                return next_time.astimezone(timezone.utc)

        # Все точки прошли - следующий день/период
        next_date = self.calculate_next_date(msg, now)
        hour, minute = map(int, time_points[0].split(':'))
        next_time = next_date.replace(
            hour=hour, minute=minute, second=0, microsecond=0)

        return next_time.astimezone(timezone.utc)

    def calculate_next_date(self, msg: RecurringMessage, current: datetime) -> datetime:
        """Рассчитать следующую дату"""
        if msg.interval_type == RecurringMessageInterval.HOURLY:
            return current + timedelta(hours=1)

        if msg.interval_type == RecurringMessageInterval.DAILY:
            return current + timedelta(days=1)

        if msg.interval_type == RecurringMessageInterval.WEEKLY:
            if msg.weekdays:
                current_weekday = current.weekday()
                next_days = [d for d in msg.weekdays if d > current_weekday]

                if next_days:
                    days_ahead = min(next_days) - current_weekday
                else:
                    days_ahead = 7 - current_weekday + min(msg.weekdays)

                return current + timedelta(days=days_ahead)
            return current + timedelta(weeks=1)

        if msg.interval_type == RecurringMessageInterval.MONTHLY:
            if current.month == 12:
                return current.replace(year=current.year + 1, month=1)
            return current.replace(month=current.month + 1)

        if msg.interval_type == RecurringMessageInterval.CUSTOM:
            if msg.interval_value:
                return current + timedelta(minutes=msg.interval_value)

        return current + timedelta(days=1)

    async def get_bot_for_owner(self, bot_id: int, owner_id: int) -> Optional[BotModel]:
        """Получить бота для владельца"""
        query = select(BotModel).where(
            and_(BotModel.id == bot_id, BotModel.owner_id == owner_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_for_owner(self, message_id: int, owner_id: int) -> Optional[RecurringMessage]:
        """Получить сообщение для владельца"""
        query = select(RecurringMessage).join(BotModel).where(
            and_(
                RecurringMessage.id == message_id,
                BotModel.owner_id == owner_id
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
