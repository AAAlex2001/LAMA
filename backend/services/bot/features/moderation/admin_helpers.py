"""Admin command helpers for moderation features."""

from aiogram.exceptions import TelegramAPIError
from aiogram.types import Message

from backend.services.rate_limiter import RateLimitTimeout
from backend.services.telegram_client import RateLimitedBot
from backend.utils.keyboard import build_keyboard

ADMIN_STATUSES = ("administrator", "creator")


async def check_is_admin(bot: RateLimitedBot, chat_id: int, user_id: int) -> bool:
    """True when user is chat administrator or creator."""
    try:
        member = await bot.get_chat_member(chat_id, user_id)
        return member.status in ADMIN_STATUSES
    except (TelegramAPIError, RateLimitTimeout):
        return False


async def find_group_owner(bot: RateLimitedBot, chat_id: int):
    """Return chat creator user or None."""
    admins = await bot.get_chat_administrators(chat_id)
    for admin in admins:
        if admin.status == "creator":
            return admin.user
    return None


async def reply_to_chat(bot: RateLimitedBot, chat_id: int, text: str) -> None:
    """Best-effort text reply used by moderation commands."""
    try:
        await bot.send_message(chat_id=chat_id, text=text)
    except Exception:
        pass


def build_admin_notification(message: Message) -> str:
    """Build /admin notification text."""
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
    """Build t.me/c link to message, including topic thread when available."""
    chat_id_str = str(message.chat.id)[4:]
    thread_id = getattr(message, "message_thread_id", None)
    if thread_id and thread_id != message.message_id:
        return f"https://t.me/c/{chat_id_str}/{thread_id}/{message.message_id}"
    return f"https://t.me/c/{chat_id_str}/{message.message_id}"


def build_reply_lines(message: Message) -> list[str]:
    """Build optional replied-message context for /admin notification."""
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
    """Build /admin inline buttons when command replies to a user message."""
    replied = message.reply_to_message
    if not replied or not replied.from_user:
        return None
    return build_keyboard([[
        {
            "text": "Забанить",
            "callback_data": f"admincall_ban_{message.chat.id}_{replied.from_user.id}_{replied.message_id}",
        },
        {
            "text": "Удалить",
            "callback_data": f"admincall_del_{message.chat.id}_{replied.from_user.id}_{replied.message_id}",
        },
    ]])