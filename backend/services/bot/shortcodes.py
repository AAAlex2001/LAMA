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
        - {user.id} - ID пользователя
        - {user.first_name} - имя пользователя
        - {user.username} - username пользователя (@username)
        - {user.last_name} - фамилия пользователя
        - {bot.first_name} - имя бота
        - {chat.title} - название чата/группы
        - {date} - текущая дата (DD.MM.YYYY)
        - {time} - текущее время (HH:MM)
        - {datetime} - текущие дата и время
        """
        if not text or not context:
            return text
        
        # Пользовательские данные
        if "user" in context:
            user = context["user"]
            first_name = user.get("first_name", "")
            username = user.get("username", "")
            last_name = user.get("last_name", "")
            user_id = str(user.get("id", ""))
            
            # Только синтаксис с точкой
            text = text.replace("{user.first_name}", first_name)
            text = text.replace("{user.username}", f"@{username}" if username else "")
            text = text.replace("{user.last_name}", last_name)
            text = text.replace("{user.id}", user_id)
        
        # Данные бота
        if "bot" in context:
            bot = context["bot"]
            text = text.replace("{bot.first_name}", bot.get("first_name", ""))
        
        # Данные чата
        if "chat" in context:
            chat = context["chat"]
            text = text.replace("{chat.title}", chat.get("title", ""))
        
        # Дата и время
        now = datetime.now()
        text = text.replace("{date}", now.strftime("%d.%m.%Y"))
        text = text.replace("{time}", now.strftime("%H:%M"))
        text = text.replace("{datetime}", now.strftime("%d.%m.%Y %H:%M"))
        
        return text


