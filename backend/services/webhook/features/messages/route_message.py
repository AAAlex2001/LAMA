"""Маршрутизация входящего сообщения: сохранить в DM/группу, обновить участников, ответить."""

import logging

from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel
from backend.schemas.direct.chat import DirectChatWsEvent
from backend.services.bot_provider import resolve_by_token
from backend.services.channel.features.auto_delete import ProcessAutoDelete
from backend.services.channel.utils.message_utils import is_system_message
from backend.services.direct.features.chats.update_photo import UpdatePhoto
from backend.services.webhook.features.members.delete_member import DeleteMember
from backend.services.webhook.features.members.update_member import UpdateMember
from backend.services.webhook.features.messages.create_chat_metadata_events import (
    CreateChatMetadataEvents,
)
from backend.services.webhook.features.messages.route_text_message import RouteTextMessage
from backend.services.webhook.features.messages.save_group_comment import SaveGroupComment
from backend.services.webhook.features.messages.save_private_message import SavePrivateMessage
from backend.services.webhook.features.messages.sync_forum_topic import SyncForumTopic

logger = logging.getLogger(__name__)


class RouteMessage:
    """Двух-фазный обработчик: сначала `save` (быстро записать + ws-событие), потом `after_save` (триггеры, команды, авто-ответы)."""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.saved_message = None

    async def save(self, message: Message) -> DirectChatWsEvent | None:
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None
        logger.info(
            "Processing message from chat %s, type=%s, bot_id=%s",
            message.chat.id,
            chat_type,
            self.bot_model.id,
        )

        if chat_type != "private":
            if is_system_message(message):
                return None
            if message.from_user and chat_type in ("group", "supergroup"):
                result = await SaveGroupComment(self.db, self.bot_model).execute(
                    message,
                    text_content,
                )
                self.saved_message = result.saved_message
                return result.ws_event
            return None

        result = await SavePrivateMessage(self.db, self.bot_model).execute(
            message,
            text_content,
        )
        self.saved_message = result.saved_message
        return result.ws_event

    async def after_save(self, message: Message) -> None:
        try:
            telegram_bot = resolve_by_token(self.bot_model.token)
            await self.set_media_url(telegram_bot)
            await self.set_user_photo(message)

            if message.new_chat_members:
                await UpdateMember(self.db, self.bot_model, telegram_bot).execute(message)
            if message.left_chat_member:
                await DeleteMember(self.db, self.bot_model, telegram_bot).execute(message)

            await CreateChatMetadataEvents(self.db, self.bot_model).execute(message)
            await SyncForumTopic(self.db, self.bot_model).execute(message)

            text_content = message.text or message.caption
            if text_content:
                await RouteTextMessage(self.db, self.bot_model, telegram_bot).execute(
                    message,
                    text_content,
                    message.chat.type if message.chat else None,
                )
        except Exception as exc:
            logger.error("Message side effects error: %s", exc, exc_info=True)

        try:
            await ProcessAutoDelete(self.db).execute(message, bot_id=self.bot_model.id)
        except Exception as exc:
            logger.error("Auto-delete processing error: %s", exc, exc_info=True)

    async def set_media_url(self, telegram_bot) -> None:
        saved_message = self.saved_message
        if not (
            saved_message
            and saved_message.media_file_id
            and not saved_message.media_url
        ):
            return

        try:
            tg_file = await telegram_bot.get_file(saved_message.media_file_id)
            if tg_file.file_path:
                saved_message.media_url = (
                    f"https://api.telegram.org/file/bot{self.bot_model.token}/"
                    f"{tg_file.file_path}"
                )
                await self.db.flush()
        except Exception as exc:
            logger.error("Failed to resolve media file URL: %s", exc, exc_info=True)

    async def set_user_photo(self, message: Message) -> None:
        if message.chat.type != "private" or not message.from_user:
            return
        photo_url = await self.get_user_photo_url(message.from_user.id)
        if photo_url:
            await UpdatePhoto(self.db).execute(self.bot_model.id, message.chat.id, photo_url)

    async def get_user_photo_url(self, user_id: int) -> str | None:
        try:
            client = resolve_by_token(self.bot_model.token)
            photos = await client.get_user_profile_photos(user_id=user_id, limit=1)
            if photos.photos and photos.photos[0]:
                tg_file = await client.get_file(photos.photos[0][-1].file_id)
                if tg_file.file_path:
                    return (
                        f"https://api.telegram.org/file/bot{self.bot_model.token}/"
                        f"{tg_file.file_path}"
                    )
        except Exception as exc:
            logger.debug("Could not resolve user photo for %s: %s", user_id, exc)
        return None
