from dataclasses import dataclass
from enum import StrEnum

from aiogram.types import Message

from backend.models.bots import Bot as BotModel, MessageType
from backend.schemas.direct.chat import DirectChatWsEvent

TELEGRAM_API_TIMEOUT = 5.0
DB_QUERY_TIMEOUT = 3.0


class TelegramUpdateType(StrEnum):
    MESSAGE = "message"
    CALLBACK_QUERY = "callback_query"
    CHAT_JOIN_REQUEST = "chat_join_request"
    CHAT_MEMBER = "chat_member"
    MY_CHAT_MEMBER = "my_chat_member"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class SavedMessageResult:
    """Результат save_*-операции: сохранённый BotMessage + side-effects."""

    ws_event: DirectChatWsEvent | None = None
    saved_message: object | None = None


class DetectMessageType:
    """Определяет тип update (CallbackQuery/Message/JoinRequest/etc.)."""

    def execute(self, message: Message) -> MessageType:
        if message.photo:
            return MessageType.PHOTO
        if message.video:
            return MessageType.VIDEO
        if message.document:
            return MessageType.DOCUMENT
        if message.audio:
            return MessageType.AUDIO
        if message.voice:
            return MessageType.VOICE
        if message.animation:
            return MessageType.ANIMATION
        if message.sticker:
            return MessageType.STICKER
        return MessageType.TEXT


class GetShortcodeContext:
    """Контекст для подстановки шорткодов в сообщениях бота."""

    def execute(self, message: Message, bot_model: BotModel) -> dict:
        from_user = message.from_user
        return {
            "user": {
                "id": from_user.id if from_user else None,
                "first_name": from_user.first_name if from_user else "",
                "username": from_user.username if from_user else None,
            },
            "bot": {"first_name": bot_model.first_name},
        }
