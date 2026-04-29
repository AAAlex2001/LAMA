"""/admin команда — уведомить владельца группы."""

import logging

from aiogram.types import Message

from backend.services.bot.features.moderation.admin_helpers import (
    build_admin_buttons,
    build_admin_notification,
    find_group_owner,
)
from backend.services.telegram_client import RateLimitedBot

logger = logging.getLogger(__name__)


async def handle_admin(message: Message, telegram_bot: RateLimitedBot) -> bool:
    """Найти creator-а группы и отправить ему уведомление с кнопками."""
    try:
        owner = await find_group_owner(telegram_bot, message.chat.id)
        if not owner:
            logger.warning("No group creator found for chat %s", message.chat.id)
            return False

        text = build_admin_notification(message)
        reply_markup = build_admin_buttons(message)
        await telegram_bot.send_message(chat_id=owner.id, text=text, reply_markup=reply_markup)
        return True
    except Exception as exc:
        logger.error("Failed to notify group owner: %s", exc)
        return False
