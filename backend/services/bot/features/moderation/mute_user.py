"""/mute и /unmute команды."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions

from backend.services.bot.features.moderation.reply_helper import reply_to_chat
from backend.services.bot.features.moderation.time_parser import parse_time
from backend.services.telegram_client import RateLimitedBot

UNMUTED_PERMISSIONS = ChatPermissions(
    can_send_messages=True,
    can_send_media_messages=True,
    can_send_polls=True,
    can_send_other_messages=True,
    can_add_web_page_previews=True,
    can_invite_users=True,
    can_change_info=False,
    can_pin_messages=False,
)

DEFAULT_MUTE_MINUTES = 10


async def mute_user(
    bot: RateLimitedBot,
    chat_id: int,
    user_id: Optional[int],
    username: Optional[str],
    parts: list,
) -> bool:
    """/mute. Если время не указано — DEFAULT_MUTE_MINUTES."""
    if not user_id:
        await reply_to_chat(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
        return True

    minutes = parse_time(parts[-1] if len(parts) > 1 else str(DEFAULT_MUTE_MINUTES))
    try:
        await bot.restrict_chat_member(
            chat_id=chat_id, user_id=user_id,
            permissions=ChatPermissions(can_send_messages=False),
            until_date=datetime.now(timezone.utc) + timedelta(minutes=minutes),
        )
        await reply_to_chat(bot, chat_id, f"Пользователь {username} заглушен на {minutes} минут")
    except TelegramAPIError as exc:
        await reply_to_chat(bot, chat_id, f"Не удалось заглушить: {exc}")
    return True


async def unmute_user(
    bot: RateLimitedBot,
    chat_id: int,
    user_id: Optional[int],
    username: Optional[str],
) -> bool:
    """/unmute — снять глушение полным набором permissions."""
    if not user_id:
        await reply_to_chat(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
        return True
    try:
        await bot.restrict_chat_member(
            chat_id=chat_id, user_id=user_id, permissions=UNMUTED_PERMISSIONS,
        )
        await reply_to_chat(bot, chat_id, f"Пользователь {username} разглушен")
    except TelegramAPIError as exc:
        await reply_to_chat(bot, chat_id, f"Не удалось разглушить: {exc}")
    return True
