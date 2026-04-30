from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventStatus, EventType
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id
from backend.services.inbox.features.create_event import CreateInboxEvent


class CreateCommandEvent:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        message: Message,
        command_text: str,
        text_content: str,
        handled: bool,
    ) -> None:
        channel = await get_channel_by_telegram_id(
            self.db,
            message.chat.id,
            bot_id=self.bot_model.id,
        )
        await CreateInboxEvent(self.db).execute(
            InboxEventCreate(
                owner_id=self.bot_model.owner_id,
                category=InboxCategory.AUTOMATION,
                entity_type=EntityType.BOT,
                event_type=EventType.BOT_COMMAND,
                bot_id=self.bot_model.id,
                channel_id=channel.id if channel else None,
                tg_user_id=message.from_user.id if message.from_user else None,
                tg_username=message.from_user.username if message.from_user else None,
                status=EventStatus.NEW,
                description=f"Команда {command_text} вызвана в {self.get_chat_name(message)}",
                payload={
                    "command": command_text,
                    "full_text": text_content,
                    "message_id": message.message_id,
                    "chat_id": message.chat.id,
                    "chat_title": message.chat.title,
                    "chat_username": message.chat.username,
                    "handled": handled,
                },
            )
        )

    @staticmethod
    def get_chat_name(message: Message) -> str:
        if message.chat.type == "private":
            if message.from_user and message.from_user.username:
                return f"личном чате с @{message.from_user.username}"
            if message.from_user and message.from_user.full_name:
                return f"личном чате с {message.from_user.full_name}"
            return "личном чате"
        if message.chat.title:
            return f'чате "{message.chat.title}"'
        if message.chat.username:
            return f"чате @{message.chat.username}"
        return f"чате {message.chat.id}"
