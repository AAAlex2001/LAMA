"""Главный диспатчер модерационных команд (/admin, /ban, /mute, ...)."""

import logging

from aiogram.types import Message

from backend.services.bot.features.moderation.admin_helpers import check_is_admin, reply_to_chat
from backend.services.bot.features.moderation.ban_user import ban_user
from backend.services.bot.features.moderation.delete_time import set_delete_time
from backend.services.bot.features.moderation.handle_admin import handle_admin
from backend.services.bot.features.moderation.mute_user import mute_user
from backend.services.bot.features.moderation.target_extractor import extract_target
from backend.services.bot.features.moderation.unban_user import unban_user
from backend.services.bot.features.moderation.unmute_user import unmute_user
from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


async def handle_moderation_command(
    command: str, message: Message, telegram_bot: RateLimitedBot,
) -> bool:
    """True если команда обработана. /admin не требует прав; остальные — для админов."""
    if not is_group_message(message):
        return False

    cmd = command.lower()

    if cmd == "/admin":
        return await handle_admin(message, telegram_bot)

    if not await check_is_admin(telegram_bot, message.chat.id, message.from_user.id):
        await reply_to_chat(
            telegram_bot, message.chat.id, "Эта команда доступна только администраторам.",
        )
        return True

    return await dispatch_admin_command(cmd, message, telegram_bot)


def is_group_message(message: Message) -> bool:
    """Команды модерации работают только в group/supergroup и от живого пользователя."""
    if message.chat.type not in ("group", "supergroup"):
        return False
    return bool(message.from_user and message.text)


async def dispatch_admin_command(
    cmd: str, message: Message, telegram_bot: RateLimitedBot,
) -> bool:
    """Маршрутизация команд админа; rate-limit → True (без сообщения, чтобы не флудить)."""
    target_user_id, target_name = extract_target(message)
    parts = (message.text or "").split()

    try:
        if cmd == "/ban":
            return await ban_user(telegram_bot, message.chat.id, target_user_id, target_name, parts)
        if cmd == "/unban":
            return await unban_user(telegram_bot, message.chat.id, target_user_id, target_name)
        if cmd == "/mute":
            return await mute_user(telegram_bot, message.chat.id, target_user_id, target_name, parts)
        if cmd == "/unmute":
            return await unmute_user(telegram_bot, message.chat.id, target_user_id, target_name)
        if cmd == "/delitetime":
            return await set_delete_time(telegram_bot, message.chat.id, parts)
    except RateLimitTimeout:
        logger.warning("Rate limit hit for command %s in chat %s", cmd, message.chat.id)
        return True

    return False
