"""
Утилита для обработки шорткодов в сообщениях ботов
"""
from datetime import datetime
from typing import Optional, Dict, Any


class ShortcodeProcessor:
    """Обработчик шорткодов для замены в текстах"""
    
    @staticmethod
    def process(text: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Обработать шорткоды в тексте
        
        Доступные шорткоды:
        - {user_name} - имя пользователя
        - {user_username} - username пользователя
        - {user_id} - ID пользователя
        - {bot_name} - имя бота
        - {date} - текущая дата
        - {time} - текущее время
        - {datetime} - текущие дата и время
        """
        if not text or not context:
            return text
        
        # Пользовательские данные
        if "user" in context:
            user = context["user"]
            text = text.replace("{user_name}", user.get("first_name", ""))
            text = text.replace("{user_username}", f"@{user.get('username', '')}" if user.get('username') else "")
            text = text.replace("{user_id}", str(user.get("id", "")))
        
        # Данные бота
        if "bot" in context:
            bot = context["bot"]
            text = text.replace("{bot_name}", bot.get("first_name", ""))
        
        # Дата и время
        now = datetime.now()
        text = text.replace("{date}", now.strftime("%d.%m.%Y"))
        text = text.replace("{time}", now.strftime("%H:%M"))
        text = text.replace("{datetime}", now.strftime("%d.%m.%Y %H:%M"))
        
        return text


