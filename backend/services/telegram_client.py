"""
Обёртка для Telegram Bot с автоматическим rate limiting
"""
import inspect
import logging
from typing import Union, Optional, Any
from aiogram import Bot
from aiogram.types import Message, ChatPermissions

from backend.services.rate_limiter import get_rate_limiter

logger = logging.getLogger(__name__)


class RateLimitedBot:
    """
    Обёртка над aiogram Bot с автоматическим rate limiting
    Все методы автоматически учитывают лимиты Telegram API
    """

    def __init__(self, bot: Bot):
        self.bot = bot
        self.rate_limiter = get_rate_limiter()

    def extract_chat_id(self, chat_id: Union[int, str]) -> Optional[int]:
        """Извлечь числовой chat_id"""
        try:
            return int(chat_id)
        except (ValueError, TypeError):
            return None

    async def send_message(self, chat_id: Union[int, str], text: str, **kwargs) -> Message:
        """Отправить текстовое сообщение с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.send_message(chat_id=chat_id, text=text, **kwargs)

    async def send_photo(self, chat_id: Union[int, str], photo: Any, **kwargs) -> Message:
        """Отправить фото с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.send_photo(chat_id=chat_id, photo=photo, **kwargs)

    async def send_video(self, chat_id: Union[int, str], video: Any, **kwargs) -> Message:
        """Отправить видео с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.send_video(chat_id=chat_id, video=video, **kwargs)

    async def send_document(self, chat_id: Union[int, str], document: Any, **kwargs) -> Message:
        """Отправить документ с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.send_document(chat_id=chat_id, document=document, **kwargs)

    async def send_audio(self, chat_id: Union[int, str], audio: Any, **kwargs) -> Message:
        """Отправить аудио с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.send_audio(chat_id=chat_id, audio=audio, **kwargs)

    async def send_animation(self, chat_id: Union[int, str], animation: Any, **kwargs) -> Message:
        """Отправить анимацию с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.send_animation(chat_id=chat_id, animation=animation, **kwargs)

    async def send_media_group(self, chat_id: Union[int, str], media: list, **kwargs) -> list:
        """Отправить медиагруппу (альбом) с rate limiting - это ОДИН API запрос!"""
        # send_media_group = 1 HTTP запрос к Telegram API, weight всегда 1
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id), weight=1):
            return await self.bot.send_media_group(chat_id=chat_id, media=media, **kwargs)

    async def delete_message(self, chat_id: Union[int, str], message_id: int, **kwargs) -> bool:
        """Удалить сообщение с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.delete_message(chat_id=chat_id, message_id=message_id, **kwargs)

    async def pin_chat_message(self, chat_id: Union[int, str], message_id: int, **kwargs) -> bool:
        """Закрепить сообщение с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.pin_chat_message(chat_id=chat_id, message_id=message_id, **kwargs)

    async def unpin_chat_message(self, chat_id: Union[int, str], message_id: Optional[int] = None, **kwargs) -> bool:
        """Открепить сообщение с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.unpin_chat_message(chat_id=chat_id, message_id=message_id, **kwargs)

    async def restrict_chat_member(self, chat_id: Union[int, str], user_id: int, permissions: ChatPermissions, **kwargs) -> bool:
        """Ограничить участника с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions, **kwargs)

    async def ban_chat_member(self, chat_id: Union[int, str], user_id: int, **kwargs) -> bool:
        """Забанить участника с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.ban_chat_member(chat_id=chat_id, user_id=user_id, **kwargs)

    async def unban_chat_member(self, chat_id: Union[int, str], user_id: int, **kwargs) -> bool:
        """Разбанить участника с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.unban_chat_member(chat_id=chat_id, user_id=user_id, **kwargs)

    async def approve_chat_join_request(self, chat_id: Union[int, str], user_id: int, **kwargs) -> bool:
        """Одобрить заявку на вступление с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.approve_chat_join_request(chat_id=chat_id, user_id=user_id, **kwargs)

    async def decline_chat_join_request(self, chat_id: Union[int, str], user_id: int, **kwargs) -> bool:
        """Отклонить заявку на вступление с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            return await self.bot.decline_chat_join_request(chat_id=chat_id, user_id=user_id, **kwargs)

    async def edit_message_text(self, text: str, chat_id: Optional[Union[int, str]] = None, message_id: Optional[int] = None, **kwargs) -> Any:
        """Редактировать текст сообщения с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id) if chat_id else None):
            return await self.bot.edit_message_text(text=text, chat_id=chat_id, message_id=message_id, **kwargs)

    async def edit_message_caption(self, chat_id: Optional[Union[int, str]] = None, message_id: Optional[int] = None, caption: Optional[str] = None, **kwargs) -> Any:
        """Редактировать подпись сообщения с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id) if chat_id else None):
            return await self.bot.edit_message_caption(chat_id=chat_id, message_id=message_id, caption=caption, **kwargs)

    async def edit_message_reply_markup(self, chat_id: Optional[Union[int, str]] = None, message_id: Optional[int] = None, reply_markup: Any = None, **kwargs) -> Any:
        """Редактировать клавиатуру сообщения с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id) if chat_id else None):
            return await self.bot.edit_message_reply_markup(chat_id=chat_id, message_id=message_id, reply_markup=reply_markup, **kwargs)

    async def answer_callback_query(self, callback_query_id: str, **kwargs) -> bool:
        """Ответить на callback query с rate limiting (без chat_id лимита)"""
        async with self.rate_limiter.limit(chat_id=None):
            return await self.bot.answer_callback_query(callback_query_id=callback_query_id, **kwargs)

    async def copy_message(self, chat_id: Union[int, str], from_chat_id: Union[int, str], message_id: int, **kwargs) -> Any:
        """Скопировать сообщение с rate limiting"""
        async with self.rate_limiter.limit(chat_id=self.extract_chat_id(chat_id)):
            result = await self.bot.copy_message(chat_id=chat_id, from_chat_id=from_chat_id, message_id=message_id, **kwargs)
            return result.message_id if hasattr(result, 'message_id') else result

    # Методы без rate limiting (информационные запросы)

    async def get_me(self):
        """Получить информацию о боте (без rate limiting)"""
        return await self.bot.get_me()

    async def get_chat(self, chat_id: Union[int, str]):
        """Получить информацию о чате (без rate limiting)"""
        return await self.bot.get_chat(chat_id=chat_id)

    async def get_chat_member(self, chat_id: Union[int, str], user_id: int):
        """Получить информацию об участнике чата (без rate limiting - это чтение)"""
        return await self.bot.get_chat_member(chat_id=chat_id, user_id=user_id)

    async def get_updates(self, **kwargs):
        """Получить обновления (без rate limiting)"""
        return await self.bot.get_updates(**kwargs)

    async def set_my_commands(self, commands: Any, **kwargs):
        """Установить команды бота (без rate limiting)"""
        return await self.bot.set_my_commands(commands=commands, **kwargs)

    @property
    def session(self):
        """Доступ к сессии бота"""
        return self.bot.session

    def __getattr__(self, name: str) -> Any:
        """Проксирование всех остальных методов к оригинальному боту.

        Важно: если метод не обёрнут явно (например, send_poll/send_sticker и т.п.),
        он всё равно должен проходить через rate limiter — иначе легко получить 429.
        """

        attr = getattr(self.bot, name)

        if not callable(attr) or not inspect.iscoroutinefunction(attr):
            return attr

        write_prefixes = (
            "send_",
            "edit_",
            "delete_",
            "pin_",
            "unpin_",
            "copy_",
            "forward_",
            "restrict_",
            "ban_",
            "unban_",
            "approve_",
            "decline_",
        )

        if not name.startswith(write_prefixes):
            return attr

        async def rate_limited(*args, **kwargs):
            # Обычно chat_id — первый positional аргумент или keyword.
            chat_id = kwargs.get("chat_id")
            if chat_id is None and args:
                chat_id = args[0]

            # send_media_group = 1 HTTP запрос, weight всегда 1
            weight = 1

            extracted = self.extract_chat_id(chat_id)
            if extracted is None:
                return await attr(*args, **kwargs)

            async with self.rate_limiter.limit(chat_id=extracted, weight=weight):
                return await attr(*args, **kwargs)

        return rate_limited
