from datetime import datetime
from typing import Optional, Dict, Any


class ShortcodeProcessor:
    """Обработчик шорткодов для замены плейсхолдеров в текстах."""

    @staticmethod
    def process(text: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Обработать шорткоды в тексте."""
        if not text or not context:
            return text

        text = ShortcodeProcessor.replace_user(text, context.get("user"))
        text = ShortcodeProcessor.replace_bot(text, context.get("bot"))
        text = ShortcodeProcessor.replace_chat(text, context.get("chat"))
        text = ShortcodeProcessor.replace_datetime(text)
        return text

    @staticmethod
    def replace_user(text: str, user: Optional[dict]) -> str:
        """Заменить шорткоды пользователя."""
        if not user:
            return text
        text = text.replace("{user.first_name}", user.get("first_name", ""))
        username = user.get("username", "")
        text = text.replace("{user.username}", f"@{username}" if username else "")
        text = text.replace("{user.last_name}", user.get("last_name", ""))
        text = text.replace("{user.id}", str(user.get("id", "")))
        return text

    @staticmethod
    def replace_bot(text: str, bot: Optional[dict]) -> str:
        """Заменить шорткоды бота."""
        if not bot:
            return text
        return text.replace("{bot.first_name}", bot.get("first_name", ""))

    @staticmethod
    def replace_chat(text: str, chat: Optional[dict]) -> str:
        """Заменить шорткоды чата."""
        if not chat:
            return text
        return text.replace("{chat.title}", chat.get("title", ""))

    @staticmethod
    def replace_datetime(text: str) -> str:
        """Заменить шорткоды даты/времени."""
        now = datetime.now()
        text = text.replace("{date}", now.strftime("%d.%m.%Y"))
        text = text.replace("{time}", now.strftime("%H:%M"))
        text = text.replace("{datetime}", now.strftime("%d.%m.%Y %H:%M"))
        text = text.replace("{year}", str(now.year))
        text = text.replace("{month}", str(now.month))
        text = text.replace("{day}", str(now.day))
        return text
