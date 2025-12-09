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
        - {user_id} - ID пользователя
        - {user_name} или {firstname} - имя пользователя
        - {user_username} или {username} - username пользователя (@username)
        - {user_last_name} или {lastname} - фамилия пользователя
        - {bot_name} - имя бота
        - {chat_title} - название чата/группы
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
            
            # Основные шорткоды
            text = text.replace("{user_name}", first_name)
            text = text.replace("{user_username}", f"@{username}" if username else "")
            text = text.replace("{user_id}", user_id)
            text = text.replace("{user_last_name}", last_name)
            
            # Алиасы для удобства
            text = text.replace("{firstname}", first_name)
            text = text.replace("{username}", f"@{username}" if username else "")
            text = text.replace("{lastname}", last_name)
        
        # Данные бота
        if "bot" in context:
            bot = context["bot"]
            text = text.replace("{bot_name}", bot.get("first_name", ""))
        
        # Данные чата
        if "chat" in context:
            chat = context["chat"]
            text = text.replace("{chat_title}", chat.get("title", ""))
        
        # Дата и время
        now = datetime.now()
        text = text.replace("{date}", now.strftime("%d.%m.%Y"))
        text = text.replace("{time}", now.strftime("%H:%M"))
        text = text.replace("{datetime}", now.strftime("%d.%m.%Y %H:%M"))
        
        return text


