"""/delitetime команда — настройка автоудаления сообщений в группе."""

from aiogram.exceptions import TelegramAPIError

from backend.services.bot.features.moderation.reply_helper import reply_to_chat
from backend.services.telegram_client import RateLimitedBot

MAX_AUTO_DELETE_SECONDS = 31_536_000  # 1 год


async def set_delete_time(bot: RateLimitedBot, chat_id: int, parts: list) -> bool:
    """parts[1] = секунды (0..1 год); 0 = выкл."""
    if len(parts) < 2:
        await reply_to_chat(bot, chat_id, "Укажите время: /delitetime <секунды>")
        return True

    seconds = parse_seconds(parts[1])
    if seconds is None:
        await reply_to_chat(bot, chat_id, "Неверный формат времени. Укажите число секунд.")
        return True

    if seconds < 0 or seconds > MAX_AUTO_DELETE_SECONDS:
        await reply_to_chat(
            bot, chat_id,
            f"Время должно быть от 0 до {MAX_AUTO_DELETE_SECONDS} секунд (1 год)",
        )
        return True

    try:
        await bot.set_chat_message_auto_delete_time(
            chat_id=chat_id, message_auto_delete_time=seconds,
        )
        confirmation = (
            "Автоудаление сообщений отключено" if seconds == 0
            else f"Автоудаление установлено на {seconds} секунд"
        )
        await reply_to_chat(bot, chat_id, confirmation)
    except TelegramAPIError as exc:
        await reply_to_chat(bot, chat_id, f"Не удалось установить автоудаление: {exc}")
    return True


def parse_seconds(text: str) -> int | None:
    """int или None если не парсится."""
    try:
        return int(text)
    except ValueError:
        return None
