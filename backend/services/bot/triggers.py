"""
Сервис для работы с триггерами событий
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict, Any
import logging

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramAPIError

from backend.models.bots import (
    Bot as BotModel,
    Trigger,
    ScheduledTriggerTask,
    TriggerType,
    TriggerActionType,
    MessageType,
)
from backend.services.bot.shortcodes import ShortcodeProcessor

logger = logging.getLogger(__name__)


class TriggerService:
    """Сервис для работы с триггерами"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # CRUD операции для триггеров
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
        filters: Optional[Dict[str, Any]] = None,
        is_active: bool = True,
        owner_id: Optional[int] = None,
    ) -> Trigger:
        """Создать триггер"""
        # Проверяем существование бота
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
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
            is_active=is_active,
        )

        self.db.add(trigger)
        await self.db.commit()
        await self.db.refresh(trigger)
        return trigger

    async def get_trigger(
        self,
        trigger_id: int,
        owner_id: Optional[int] = None,
    ) -> Optional[Trigger]:
        """Получить триггер по ID"""
        query = select(Trigger).where(Trigger.id == trigger_id)
        if owner_id is not None:
            query = query.join(BotModel).where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_triggers(
        self,
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

        # Подсчёт
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных
        query = query.order_by(Trigger.created_at.desc())
        result = await self.db.execute(query)
        triggers = list(result.scalars().all())

        return triggers, total

    async def update_trigger(
        self,
        trigger_id: int,
        owner_id: Optional[int] = None,
        **kwargs,
    ) -> Optional[Trigger]:
        """Обновить триггер"""
        trigger = await self.get_trigger(trigger_id, owner_id)
        if not trigger:
            return None

        for key, value in kwargs.items():
            if hasattr(trigger, key) and value is not None:
                setattr(trigger, key, value)

        trigger.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(trigger)
        return trigger

    async def delete_trigger(
        self,
        trigger_id: int,
        owner_id: Optional[int] = None,
    ) -> bool:
        """Удалить триггер"""
        trigger = await self.get_trigger(trigger_id, owner_id)
        if not trigger:
            return False

        await self.db.delete(trigger)
        await self.db.commit()
        return True

    # ========================================================================
    # Обработка событий
    # ========================================================================

    async def get_triggers_for_event(
        self,
        bot_id: int,
        trigger_type: TriggerType,
    ) -> List[Trigger]:
        """Получить активные триггеры для события"""
        query = select(Trigger).where(
            Trigger.bot_id == bot_id,
            Trigger.trigger_type == trigger_type,
            Trigger.is_active == True,
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def fire_event(
        self,
        bot_id: int,
        trigger_type: TriggerType,
        user_id: int,
        chat_id: int,
        telegram_bot: Bot,
        context: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Запустить обработку события.
        Возвращает количество сработавших триггеров.
        """
        triggers = await self.get_triggers_for_event(bot_id, trigger_type)
        executed = 0

        for trigger in triggers:
            # Проверяем фильтры
            if not self.check_filters(trigger, user_id, chat_id):
                continue

            # Если есть задержка - планируем на потом
            if trigger.delay_minutes > 0:
                await self.schedule_trigger(trigger, user_id, chat_id, context)
                executed += 1
                continue

            # Выполняем сразу
            try:
                await self.execute_trigger(trigger, user_id, chat_id, telegram_bot, context)
                executed += 1
            except Exception as e:
                logger.error(f"Trigger {trigger.id} execution failed: {e}")

        return executed

    def check_filters(
        self,
        trigger: Trigger,
        user_id: int,
        chat_id: int,
    ) -> bool:
        """Проверить фильтры триггера"""
        if not trigger.filters:
            return True

        # Фильтр по chat_id
        chat_ids = trigger.filters.get("chat_ids")
        if chat_ids and chat_id not in chat_ids:
            return False

        # Фильтр по user_id
        user_ids = trigger.filters.get("user_ids")
        if user_ids and user_id not in user_ids:
            return False

        return True

    def check_delivery_window(self, trigger: Trigger) -> bool:
        """Проверить окно доставки"""
        if not trigger.delivery_window:
            return True

        import pytz

        tz_name = trigger.delivery_window.get("timezone", "UTC")
        try:
            tz = pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            tz = pytz.UTC

        now = datetime.now(tz)
        start_hour = trigger.delivery_window.get("start_hour", 0)
        end_hour = trigger.delivery_window.get("end_hour", 24)

        return start_hour <= now.hour < end_hour

    async def schedule_trigger(
        self,
        trigger: Trigger,
        user_id: int,
        chat_id: int,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Запланировать отложенный триггер"""
        execute_at = datetime.now(timezone.utc) + timedelta(minutes=trigger.delay_minutes)

        task = ScheduledTriggerTask(
            trigger_id=trigger.id,
            user_id=user_id,
            chat_id=chat_id,
            execute_at=execute_at,
            event_context=context,
        )

        self.db.add(task)
        await self.db.commit()

    async def execute_trigger(
        self,
        trigger: Trigger,
        user_id: int,
        chat_id: int,
        telegram_bot: Bot,
        context: Optional[dict] = None,
    ):
        """Выполнить действие триггера"""
        # Проверяем окно доставки
        if not self.check_delivery_window(trigger):
            # Если вне окна - планируем на следующее окно
            await self.schedule_for_next_window(trigger, user_id, chat_id, context)
            return

        action_data = trigger.action_data or {}
        # Добавляем контекст в action_data для шорткодов
        action_data["context"] = context or {}

        if trigger.action_type == TriggerActionType.SEND_MESSAGE:
            await self.send_message(telegram_bot, chat_id, user_id, action_data)

        elif trigger.action_type == TriggerActionType.SEND_MEDIA:
            await self.send_media(telegram_bot, chat_id, user_id, action_data)

        elif trigger.action_type == TriggerActionType.MUTE_USER:
            await self.mute_user(telegram_bot, chat_id, user_id, action_data)

        elif trigger.action_type == TriggerActionType.BAN_USER:
            await self.ban_user(telegram_bot, chat_id, user_id, action_data)

    async def schedule_for_next_window(
        self,
        trigger: Trigger,
        user_id: int,
        chat_id: int,
        context: Optional[Dict[str, Any]] = None,
    ):
        """Запланировать на следующее окно доставки"""
        import pytz

        if not trigger.delivery_window:
            return

        tz_name = trigger.delivery_window.get("timezone", "UTC")
        try:
            tz = pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            tz = pytz.UTC

        now = datetime.now(tz)
        start_hour = trigger.delivery_window.get("start_hour", 9)

        # Следующее окно - начало следующего дня
        if now.hour >= start_hour:
            next_window = now.replace(hour=start_hour, minute=0, second=0) + timedelta(days=1)
        else:
            next_window = now.replace(hour=start_hour, minute=0, second=0)

        execute_at = next_window.astimezone(pytz.UTC)

        task = ScheduledTriggerTask(
            trigger_id=trigger.id,
            user_id=user_id,
            chat_id=chat_id,
            execute_at=execute_at,
            event_context=context,
        )

        self.db.add(task)
        await self.db.commit()

    async def send_message(
        self,
        telegram_bot: Bot,
        chat_id: int,
        user_id: int,
        action_data: dict,
    ):
        """Отправить текстовое сообщение"""
        text = action_data.get("text", "")
        if not text:
            return

        # Обработка шорткодов
        bot_info = await telegram_bot.get_me()
        shortcode_context = {
            "user": {
                "id": user_id,
                "first_name": action_data.get("context", {}).get("first_name", ""),
                "username": action_data.get("context", {}).get("username", ""),
            },
            "bot": {
                "first_name": bot_info.first_name if bot_info else "",
            }
        }
        text = ShortcodeProcessor.process(text, shortcode_context)

        # Формируем кнопки
        reply_markup = self.build_keyboard(action_data.get("buttons"))

        try:
            await telegram_bot.send_message(
                chat_id=chat_id,
                text=text,
                reply_markup=reply_markup,
            )
        except TelegramAPIError as e:
            logger.warning(f"Failed to send trigger message to {user_id}: {e}")

    async def send_media(
        self,
        telegram_bot: Bot,
        chat_id: int,
        user_id: int,
        action_data: dict,
    ):
        """Отправить медиа"""
        media_url = action_data.get("media_url")
        media_type = action_data.get("media_type", "PHOTO")
        caption = action_data.get("text", "")
        
        # Обработка шорткодов в caption
        if caption:
            bot_info = await telegram_bot.get_me()
            shortcode_context = {
                "user": {
                    "id": user_id,
                    "first_name": action_data.get("context", {}).get("first_name", ""),
                    "username": action_data.get("context", {}).get("username", ""),
                },
                "bot": {
                    "first_name": bot_info.first_name if bot_info else "",
                }
            }
            caption = ShortcodeProcessor.process(caption, shortcode_context)
        
        reply_markup = self.build_keyboard(action_data.get("buttons"))

        if not media_url:
            return

        try:
            if media_type == "PHOTO":
                await telegram_bot.send_photo(
                    chat_id=chat_id,
                    photo=media_url,
                    caption=caption,
                    reply_markup=reply_markup,
                )
            elif media_type == "VIDEO":
                await telegram_bot.send_video(
                    chat_id=chat_id,
                    video=media_url,
                    caption=caption,
                    reply_markup=reply_markup,
                )
            elif media_type == "DOCUMENT":
                await telegram_bot.send_document(
                    chat_id=chat_id,
                    document=media_url,
                    caption=caption,
                    reply_markup=reply_markup,
                )
        except TelegramAPIError as e:
            logger.warning(f"Failed to send trigger media to {chat_id}: {e}")

    async def mute_user(
        self,
        telegram_bot: Bot,
        chat_id: int,
        user_id: int,
        action_data: Dict[str, Any],
    ):
        """Заглушить пользователя"""
        from aiogram.types import ChatPermissions

        duration_minutes = action_data.get("duration_minutes", 60)
        until_date = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)

        try:
            await telegram_bot.restrict_chat_member(
                chat_id=chat_id,
                user_id=user_id,
                permissions=ChatPermissions(can_send_messages=False),
                until_date=until_date,
            )
        except TelegramAPIError as e:
            logger.warning(f"Failed to mute user {user_id}: {e}")

    async def ban_user(
        self,
        telegram_bot: Bot,
        chat_id: int,
        user_id: int,
        action_data: Dict[str, Any],
    ):
        """Забанить пользователя"""
        duration_minutes = action_data.get("duration_minutes", 0)

        try:
            if duration_minutes > 0:
                until_date = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
                await telegram_bot.ban_chat_member(
                    chat_id=chat_id,
                    user_id=user_id,
                    until_date=until_date,
                )
            else:
                await telegram_bot.ban_chat_member(
                    chat_id=chat_id,
                    user_id=user_id,
                )
        except TelegramAPIError as e:
            logger.warning(f"Failed to ban user {user_id}: {e}")

    def build_keyboard(
        self,
        buttons_data: Optional[List[List[Dict[str, str]]]],
    ) -> Optional[InlineKeyboardMarkup]:
        """Построить клавиатуру из данных"""
        if not buttons_data:
            return None

        keyboard = []
        for row in buttons_data:
            button_row = []
            for btn in row:
                button_row.append(
                    InlineKeyboardButton(
                        text=btn.get("text", ""),
                        url=btn.get("url"),
                        callback_data=btn.get("callback_data"),
                    )
                )
            keyboard.append(button_row)

        return InlineKeyboardMarkup(inline_keyboard=keyboard) if keyboard else None

    # ========================================================================
    # Обработка отложенных триггеров
    # ========================================================================

    async def get_pending_tasks(self, limit: int = 100) -> List[ScheduledTriggerTask]:
        """Получить задачи, готовые к выполнению"""
        now = datetime.now(timezone.utc)
        query = select(ScheduledTriggerTask).where(
            ScheduledTriggerTask.is_executed == False,
            ScheduledTriggerTask.execute_at <= now,
        ).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def execute_scheduled_task(
        self,
        task: ScheduledTriggerTask,
        telegram_bot: Bot,
    ) -> bool:
        """Выполнить отложенную задачу"""
        # Загружаем триггер
        query = select(Trigger).where(Trigger.id == task.trigger_id)
        result = await self.db.execute(query)
        trigger = result.scalar_one_or_none()

        if not trigger or not trigger.is_active:
            task.is_executed = True
            task.executed_at = datetime.now(timezone.utc)
            await self.db.commit()
            return False

        try:
            await self._execute_trigger(
                trigger,
                task.user_id,
                task.chat_id,
                telegram_bot,
                task.event_context,
            )
            task.is_executed = True
            task.executed_at = datetime.now(timezone.utc)
            await self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Scheduled task {task.id} failed: {e}")
            return False
