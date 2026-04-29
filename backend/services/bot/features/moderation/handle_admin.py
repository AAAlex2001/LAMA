"""/admin команда — уведомить владельца группы."""

import logging

from aiogram.types import Message

from backend.services.bot.features.moderation.check_is_admin import find_group_owner
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard

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


def build_admin_notification(message: Message) -> str:
    """Текст уведомления: вызвавший + чат + ссылка + reply-context."""
    user = message.from_user
    user_info = user.first_name + (f" (@{user.username})" if user.username else "")

    chat_link = build_chat_link(message)
    chat_title = message.chat.title or "Unknown Group"

    lines = [
        "ВЫЗОВ АДМИНИСТРАТОРА\n",
        f"Пользователь: {user_info}",
        f"Группа: {chat_title}",
        f"Chat ID: `{message.chat.id}`",
        f"Перейти: {chat_link}",
        f"Текст: {message.text or 'N/A'}",
    ]

    lines.extend(build_reply_lines(message))

    if message.date:
        lines.append(f"\nВремя: {message.date.strftime('%Y-%m-%d %H:%M:%S')}")

    return "\n".join(lines)


def build_chat_link(message: Message) -> str:
    """t.me/c-ссылка на сообщение, с учётом message_thread_id для топиков."""
    chat_id_str = str(message.chat.id)[4:]
    thread_id = getattr(message, "message_thread_id", None)
    if thread_id and thread_id != message.message_id:
        return f"https://t.me/c/{chat_id_str}/{thread_id}/{message.message_id}"
    return f"https://t.me/c/{chat_id_str}/{message.message_id}"


def build_reply_lines(message: Message) -> list[str]:
    """Если есть reply_to_message — добавляет блок 'Ответ на: ... User ID: ... Сообщение: ...'."""
    replied = message.reply_to_message
    if not replied:
        return []

    replied_text = (replied.text or replied.caption or "").strip()[:200]
    replied_user_name = "N/A"
    replied_user_id = None
    if replied.from_user:
        replied_user_id = replied.from_user.id
        replied_user_name = replied.from_user.first_name
        if replied.from_user.username:
            replied_user_name += f" (@{replied.from_user.username})"

    return [
        f"\nОтвет на: {replied_user_name}",
        f"User ID: `{replied_user_id}`",
        f"Сообщение: {replied_text or 'N/A'}",
    ]


def build_admin_buttons(message: Message):
    """[Забанить, Удалить] кнопки если есть reply_to_message; иначе None."""
    replied = message.reply_to_message
    if not replied or not replied.from_user:
        return None

    return build_keyboard([[
        {"text": "Забанить",
         "callback_data": f"admincall_ban_{message.chat.id}_{replied.from_user.id}_{replied.message_id}"},
        {"text": "Удалить",
         "callback_data": f"admincall_del_{message.chat.id}_{replied.from_user.id}_{replied.message_id}"},
    ]])
