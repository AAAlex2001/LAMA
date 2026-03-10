import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict, Any

import pytz
from aiogram import Bot
from aiogram.types import ChatPermissions, InputMediaPhoto, InputMediaVideo, InputMediaDocument
from aiogram.exceptions import TelegramAPIError
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models.bots import (
    Bot as BotModel, Trigger, ScheduledTriggerTask,
    TriggerType, TriggerActionType, TriggerChatType,
)
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.bot_provider import get_bot_info
from backend.services.publications.utils.media_utils import is_video_url, is_document_url
from backend.utils.keyboard import build_keyboard

logger = logging.getLogger(__name__)

JOIN_REQUEST_TYPES = (
    TriggerType.JOIN_REQUEST_CREATED,
    TriggerType.JOIN_REQUEST_APPROVED,
    TriggerType.JOIN_REQUEST_REJECTED,
)

MEDIA_SEND_METHODS = {
    "PHOTO": "send_photo",
    "VIDEO": "send_video",
    "DOCUMENT": "send_document",
}


class BotTriggerService:
    """Триггеры: CRUD, фильтры, выполнение, планирование."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, bot_id: int, name: str,
        trigger_type: TriggerType, action_type: TriggerActionType,
        action_data: Optional[Dict[str, Any]] = None,
        delay_minutes: int = 0,
        delivery_window: Optional[Dict[str, Any]] = None,
        filters_data: Optional[Dict[str, Any]] = None,
        chat_type: Optional[TriggerChatType] = None,
        is_active: bool = True,
        owner_id: Optional[int] = None,
    ) -> Trigger:
        """Создать триггер."""
        await self.ensure_bot_exists(bot_id, owner_id)

        trigger = Trigger(
            bot_id=bot_id, name=name,
            trigger_type=trigger_type, action_type=action_type,
            action_data=action_data, delay_minutes=delay_minutes,
            delivery_window=delivery_window, filters=filters_data,
            chat_type=chat_type or TriggerChatType.BOTH,
            is_active=is_active,
        )
        self.db.add(trigger)
        await self.db.commit()
        await self.db.refresh(trigger)
        return trigger

    async def get(self, trigger_id: int, owner_id: Optional[int] = None) -> Optional[Trigger]:
        """Получить триггер по ID."""
        query = select(Trigger).where(Trigger.id == trigger_id)
        if owner_id is not None:
            query = query.join(BotModel).where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_list(
        self, bot_id: int,
        trigger_type: Optional[TriggerType] = None,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[Trigger], int]:
        """Получить список триггеров бота."""
        query = select(Trigger).where(Trigger.bot_id == bot_id)
        if owner_id is not None:
            query = query.join(BotModel).where(BotModel.owner_id == owner_id)
        if trigger_type is not None:
            query = query.where(Trigger.trigger_type == trigger_type)
        if is_active is not None:
            query = query.where(Trigger.is_active == is_active)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        result = await self.db.execute(query.order_by(Trigger.created_at.desc()))
        return list(result.scalars().all()), total

    async def update(self, trigger_id: int, owner_id: Optional[int] = None, **kwargs) -> Optional[Trigger]:
        """Обновить триггер."""
        trigger = await self.get(trigger_id, owner_id)
        if not trigger:
            return None

        for key, value in kwargs.items():
            if hasattr(trigger, key) and value is not None:
                setattr(trigger, key, value)

        trigger.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(trigger)
        return trigger

    async def delete(self, trigger_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить триггер."""
        trigger = await self.get(trigger_id, owner_id)
        if not trigger:
            return False
        await self.db.delete(trigger)
        await self.db.commit()
        return True

    async def fire_event(
        self, bot_id: int, trigger_type: TriggerType,
        user_id: int, chat_id: int, telegram_bot: Bot,
        context: Optional[Dict[str, Any]] = None,
        chat_type: Optional[str] = None,
    ) -> int:
        """Запустить обработку события. Возвращает кол-во сработавших триггеров."""
        triggers = await self.get_active_for_event(bot_id, trigger_type)
        executed = 0

        for trigger in triggers:
            if not self.matches_chat_type(trigger, chat_type):
                continue
            if not self.matches_filters(trigger, user_id, chat_id, context):
                continue

            if trigger.delay_minutes > 0:
                await self.schedule(trigger, user_id, chat_id, context)
                executed += 1
                continue

            try:
                await self.execute(trigger, user_id, chat_id, telegram_bot, context)
                executed += 1
            except Exception as e:
                logger.error(f"Trigger {trigger.id} execution failed: {e}")

        return executed

    async def execute(
        self, trigger: Trigger, user_id: int, chat_id: int,
        telegram_bot: Bot, context: Optional[dict] = None,
    ) -> None:
        """Выполнить действие триггера."""
        if not self.is_in_delivery_window(trigger):
            await self.schedule_for_next_window(trigger, user_id, chat_id, context)
            return

        action_data = dict(trigger.action_data or {})
        action_data["context"] = context or {}
        target = user_id if trigger.trigger_type in JOIN_REQUEST_TYPES else chat_id

        action_map = {
            TriggerActionType.SEND_MESSAGE: self.action_send_message,
            TriggerActionType.SEND_MEDIA: self.action_send_media,
            TriggerActionType.MUTE_USER: self.action_mute,
            TriggerActionType.BAN_USER: self.action_ban,
        }

        handler = action_map.get(trigger.action_type)
        if handler:
            await handler(telegram_bot, target, user_id, action_data)

    async def get_pending_tasks(self, limit: int = 100) -> List[ScheduledTriggerTask]:
        """Получить задачи готовые к выполнению."""
        result = await self.db.execute(
            select(ScheduledTriggerTask)
            .options(joinedload(ScheduledTriggerTask.trigger))
            .where(
                ScheduledTriggerTask.is_executed == False,
                ScheduledTriggerTask.execute_at <= datetime.now(timezone.utc),
            ).limit(limit)
        )
        return list(result.unique().scalars().all())

    async def execute_scheduled_task(self, task: ScheduledTriggerTask, telegram_bot: Bot) -> bool:
        """Выполнить отложенную задачу."""
        trigger = (await self.db.execute(
            select(Trigger).where(Trigger.id == task.trigger_id)
        )).scalar_one_or_none()

        if not trigger or not trigger.is_active:
            task.is_executed = True
            task.executed_at = datetime.now(timezone.utc)
            await self.db.commit()
            return False

        ctx = task.event_context if isinstance(task.event_context, dict) else {}
        try:
            await self.execute(trigger, task.user_id, task.chat_id, telegram_bot, ctx)
            task.is_executed = True
            task.executed_at = datetime.now(timezone.utc)
            await self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Scheduled task {task.id} failed: {e}")
            return False

    async def action_send_message(self, bot: Bot, chat_id: int, user_id: int, data: dict) -> None:
        """Действие: отправить текст."""
        text = data.get("text", "")
        if not text:
            return
        bot_info = await get_bot_info(bot.bot.token)
        text = ShortcodeProcessor.process(text, self.build_shortcode_ctx(user_id, data, bot_info))
        try:
            await bot.send_message(chat_id=chat_id, text=text, reply_markup=build_keyboard(data.get("buttons")))
        except TelegramAPIError as e:
            logger.warning(f"Failed to send trigger message to {chat_id}: {e}")

    async def action_send_media(self, bot: Bot, chat_id: int, user_id: int, data: dict) -> None:
        """Действие: отправить медиа (одиночное или альбом)."""
        media_urls = [u for u in (data.get("media_urls") or []) if u]
        media_url = data.get("media_url")
        if not media_urls and media_url:
            media_urls = [media_url]
        if not media_urls:
            return

        caption = data.get("text", "")
        if caption:
            bot_info = await get_bot_info(bot.bot.token)
            caption = ShortcodeProcessor.process(caption, self.build_shortcode_ctx(user_id, data, bot_info))

        try:
            if len(media_urls) > 1:
                media_group = []
                for i, url in enumerate(media_urls[:10]):
                    cap = caption if i == 0 else None
                    if is_video_url(url):
                        media_group.append(InputMediaVideo(media=url, caption=cap))
                    elif is_document_url(url):
                        media_group.append(InputMediaDocument(media=url, caption=cap))
                    else:
                        media_group.append(InputMediaPhoto(media=url, caption=cap))
                await bot.send_media_group(chat_id=chat_id, media=media_group)
                return

            media_type = data.get("media_type", "PHOTO")
            method_name = MEDIA_SEND_METHODS.get(media_type)
            if not method_name:
                return
            method = getattr(bot, method_name)
            await method(
                chat_id=chat_id,
                **{media_type.lower(): media_urls[0]},
                caption=caption,
                reply_markup=build_keyboard(data.get("buttons")),
            )
        except TelegramAPIError as e:
            logger.warning(f"Failed to send trigger media to {chat_id}: {e}")

    async def action_mute(self, bot: Bot, chat_id: int, user_id: int, data: dict) -> None:
        """Действие: заглушить пользователя."""
        minutes = data.get("duration_minutes", 60)
        try:
            await bot.restrict_chat_member(
                chat_id=chat_id, user_id=user_id,
                permissions=ChatPermissions(can_send_messages=False),
                until_date=datetime.now(timezone.utc) + timedelta(minutes=minutes),
            )
        except TelegramAPIError as e:
            logger.warning(f"Failed to mute user {user_id}: {e}")

    async def action_ban(self, bot: Bot, chat_id: int, user_id: int, data: dict) -> None:
        """Действие: забанить пользователя."""
        minutes = data.get("duration_minutes", 0)
        try:
            kwargs = {"chat_id": chat_id, "user_id": user_id}
            if minutes > 0:
                kwargs["until_date"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
            await bot.ban_chat_member(**kwargs)
        except TelegramAPIError as e:
            logger.warning(f"Failed to ban user {user_id}: {e}")

    def matches_chat_type(self, trigger: Trigger, chat_type: Optional[str]) -> bool:
        """Проверить совместимость типа чата с триггером."""
        if not hasattr(trigger, "chat_type") or trigger.chat_type == TriggerChatType.BOTH:
            return True
        if not chat_type:
            return True
        if trigger.chat_type == TriggerChatType.PRIVATE:
            return chat_type == "private"
        if trigger.chat_type == TriggerChatType.GROUP:
            return chat_type in ("group", "supergroup")
        return True

    def matches_filters(self, trigger: Trigger, user_id: int, chat_id: int, context: Optional[dict]) -> bool:
        """Проверить фильтры триггера."""
        if not trigger.filters:
            return True

        f = trigger.filters
        ctx = context or {}

        if "chat_ids" in f and chat_id not in f["chat_ids"]:
            return False
        if "user_ids" in f and user_id not in f["user_ids"]:
            return False
        if "command" in f and ctx.get("command", "").lower() != f["command"].lower():
            return False
        if "text_contains" in f and f["text_contains"].lower() not in ctx.get("text", "").lower():
            return False
        return True

    def is_in_delivery_window(self, trigger: Trigger) -> bool:
        """Проверить что сейчас в окне доставки."""
        window = trigger.delivery_window
        if not window or not isinstance(window, dict):
            return True
        tz = self.resolve_tz(window.get("timezone", "UTC"))
        now = datetime.now(tz)
        return window.get("start_hour", 0) <= now.hour < window.get("end_hour", 24)

    async def schedule(self, trigger: Trigger, user_id: int, chat_id: int, context: Optional[dict]) -> None:
        """Запланировать отложенный триггер."""
        self.db.add(ScheduledTriggerTask(
            trigger_id=trigger.id, user_id=user_id, chat_id=chat_id,
            execute_at=datetime.now(timezone.utc) + timedelta(minutes=trigger.delay_minutes),
            event_context=context,
        ))
        await self.db.commit()

    async def schedule_for_next_window(self, trigger: Trigger, user_id: int, chat_id: int, context: Optional[dict]) -> None:
        """Запланировать на начало следующего окна доставки."""
        window = trigger.delivery_window
        if not window or not isinstance(window, dict):
            return

        tz = self.resolve_tz(window.get("timezone", "UTC"))
        now = datetime.now(tz)
        start_hour = window.get("start_hour", 9)

        if now.hour >= start_hour:
            next_window = now.replace(hour=start_hour, minute=0, second=0) + timedelta(days=1)
        else:
            next_window = now.replace(hour=start_hour, minute=0, second=0)

        self.db.add(ScheduledTriggerTask(
            trigger_id=trigger.id, user_id=user_id, chat_id=chat_id,
            execute_at=next_window.astimezone(pytz.UTC),
            event_context=context,
        ))
        await self.db.commit()

    async def get_active_for_event(self, bot_id: int, trigger_type: TriggerType) -> List[Trigger]:
        """Получить активные триггеры для типа события."""
        result = await self.db.execute(
            select(Trigger).where(
                Trigger.bot_id == bot_id,
                Trigger.trigger_type == trigger_type,
                Trigger.is_active == True,
            )
        )
        return list(result.scalars().all())

    async def ensure_bot_exists(self, bot_id: int, owner_id: Optional[int]) -> None:
        """Проверить что бот существует."""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        if not (await self.db.execute(query)).scalar_one_or_none():
            raise ValueError("Bot not found")

    def build_shortcode_ctx(self, user_id: int, data: dict, bot_info) -> dict:
        """Построить контекст для шорткодов."""
        ctx = data.get("context", {})
        if not isinstance(ctx, dict):
            ctx = {}
        return {
            "user": {"id": user_id, "first_name": ctx.get("first_name", ""), "username": ctx.get("username", "")},
            "bot": {"first_name": bot_info.first_name if bot_info else ""},
        }

    def resolve_tz(self, tz_name: str):
        """Получить timezone объект."""
        try:
            return pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            return pytz.UTC
