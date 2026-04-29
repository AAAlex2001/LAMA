"""Отправка одного повторяющегося сообщения во все target_chats + пересчёт next_send_at."""

import asyncio
from datetime import datetime, timezone

import pytz
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import RecurringMessage
from backend.services.bot.bot_shortcodes import ShortcodeProcessor
from backend.services.bot.features.recurring.schedule_calculator import calculate_next_send
from backend.services.bot.features.recurring.send_to_chat import send_to_chat
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard


class SendRecurring:
    """Если текущий день не в weekdays — пересчёт без отправки. Иначе — параллельная отправка."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, msg: RecurringMessage, telegram_bot: RateLimitedBot) -> None:
        now = datetime.now(timezone.utc)

        if is_past_end_date(msg, now):
            msg.is_active = False
            await self.db.flush()
            return

        if not is_today_allowed(msg):
            msg.next_send_at = calculate_next_send(msg)
            await self.db.flush()
            return

        keyboard = build_keyboard(msg.inline_buttons)
        text = ShortcodeProcessor.replace_datetime(msg.text_content or "")

        await asyncio.gather(
            *(
                send_to_chat(self.db, telegram_bot, chat_id, msg, text, keyboard)
                for chat_id in msg.target_chats
            ),
            return_exceptions=True,
        )

        msg.last_sent_at = now
        msg.next_send_at = calculate_next_send(msg)
        await self.db.flush()


def is_past_end_date(msg: RecurringMessage, now: datetime) -> bool:
    """True если задана end_date и она в прошлом — больше не отправлять."""
    return bool(msg.end_date and now > msg.end_date)


def is_today_allowed(msg: RecurringMessage) -> bool:
    """True если weekdays пустой ИЛИ сегодня в weekdays (в локальной таймзоне сообщения)."""
    if not msg.weekdays:
        return True
    tz = pytz.timezone(msg.timezone)
    return datetime.now(tz).weekday() in msg.weekdays
