"""/unmute command action."""

from typing import Optional

from aiogram.exceptions import TelegramAPIError
from aiogram.types import ChatPermissions

from backend.services.bot.features.moderation.admin_helpers import reply_to_chat
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


async def unmute_user(
    bot: RateLimitedBot,
    chat_id: int,
    user_id: Optional[int],
    username: Optional[str],
) -> bool:
    """Restore target user send permissions, returning True because command was handled."""
    if not user_id:
        await reply_to_chat(bot, chat_id, "Ответьте на сообщение пользователя или укажите @username")
        return True
    try:
        await bot.restrict_chat_member(
            chat_id=chat_id,
            user_id=user_id,
            permissions=UNMUTED_PERMISSIONS,
        )
        await reply_to_chat(bot, chat_id, f"Пользователь {username} разглушен")
    except TelegramAPIError as exc:
        await reply_to_chat(bot, chat_id, f"Не удалось разглушить: {exc}")
    return True