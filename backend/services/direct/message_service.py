from fastapi import HTTPException
from collections.abc import Sequence
from typing import Any, List, Optional
import logging
from aiogram.enums import ParseMode
from aiogram.types import InputMediaAudio, InputMediaDocument, InputMediaPhoto, InputMediaVideo, Message
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.models.direct import DirectChat
from backend.models.bots import BotMessage, Bot, MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.schemas.direct.message import EditMessageRequest
from backend.services.publications.utils.media_utils import is_audio_url, is_document_url, is_video_url
from backend.services.webhook.base import get_bot_session
from backend.utils.keyboard import build_keyboard
from backend.websockets.manager import ws_manager

logger = logging.getLogger(__name__)

class DirectMessageService:
    """Сервис для работы с сообщениями в Директе."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    def get_request_media_urls(self, request: SendMessageRequest) -> List[str]:
        if request.media_urls:
            return [url for url in request.media_urls if url]
        if request.media_url:
            return [request.media_url]
        return []

    def message_get(self, message: Message | dict, key: str, default: Any = None) -> Any:
        if isinstance(message, dict):
            return message.get(key, default)
        return getattr(message, key, default)

    def extract_nested_id(self, value: Any, key: str = "id") -> Optional[int]:
        if value is None:
            raise HTTPException(status_code=404, detail="Message not found or access denied")
        if isinstance(value, dict):
            nested_value = value.get(key)
        else:
            nested_value = getattr(value, key, None)
        if nested_value is None:
            raise HTTPException(status_code=404, detail="Message not found or access denied")
        return int(nested_value)

    def extract_file_id_from_entity(self, entity: Any) -> Optional[str]:
        if entity is None:
            return None
        if isinstance(entity, dict):
            file_id = entity.get("file_id")
        else:
            file_id = getattr(entity, "file_id", None)
        return str(file_id) if file_id else None

    def extract_file_id_from_collection(self, collection: Any) -> Optional[str]:
        if not collection:
            return None
        if isinstance(collection, Sequence) and not isinstance(collection, (str, bytes, bytearray)):
            last_item = collection[-1]
            return self.extract_file_id_from_entity(last_item)
        return self.extract_file_id_from_entity(collection)

    def get_raw_message_data(self, message: Message | dict) -> dict:
        if isinstance(message, dict):
            return message
        return message.model_dump(mode="python", by_alias=True)

    def extract_incoming_media(self, message: Message | dict) -> tuple[MessageType, Optional[str]]:
        raw_data = self.get_raw_message_data(message)

        photo = self.message_get(message, "photo") or raw_data.get("photo")
        photo_file_id = self.extract_file_id_from_collection(photo)
        if photo or photo_file_id:
            return MessageType.PHOTO, photo_file_id

        for field_name, message_type in (
            ("video", MessageType.VIDEO),
            ("document", MessageType.DOCUMENT),
            ("audio", MessageType.AUDIO),
            ("voice", MessageType.VOICE),
            ("animation", MessageType.ANIMATION),
            ("sticker", MessageType.STICKER),
        ):
            entity = self.message_get(message, field_name) or raw_data.get(field_name)
            file_id = self.extract_file_id_from_entity(entity)
            if entity or file_id:
                return message_type, file_id

        return MessageType.TEXT, None

    def detect_media_type(self, media_url: str) -> MessageType:
        if is_document_url(media_url):
            return MessageType.DOCUMENT
        if is_audio_url(media_url):
            return MessageType.AUDIO
        if is_video_url(media_url):
            return MessageType.VIDEO
        return MessageType.PHOTO

    def extract_media_file_id(self, message: Message, message_type: MessageType) -> Optional[str]:
        if message_type == MessageType.TEXT:
            return None
        if message_type == MessageType.PHOTO and message.photo:
            return message.photo[-1].file_id
        if message_type == MessageType.VIDEO and message.video:
            return message.video.file_id
        if message_type == MessageType.DOCUMENT and message.document:
            return message.document.file_id
        if message_type == MessageType.AUDIO and message.audio:
            return message.audio.file_id
        if message_type == MessageType.VOICE and message.voice:
            return message.voice.file_id
        if message_type == MessageType.ANIMATION and message.animation:
            return message.animation.file_id
        if message_type == MessageType.STICKER and message.sticker:
            return message.sticker.file_id
        raise HTTPException(status_code=404, detail="Media file not found")(self, message: Message, fallback: MessageType = MessageType.TEXT) -> MessageType:
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
        if message.text or message.caption:
            return MessageType.TEXT if not any([message.photo, message.video, message.document, message.audio, message.voice, message.animation, message.sticker]) else fallback
        return fallback

    def build_media_item(self, media_url: str, caption: Optional[str]):
        parse_mode = ParseMode.HTML if caption else None

        if is_document_url(media_url):
            return InputMediaDocument(media=media_url, caption=caption, parse_mode=parse_mode)
        if is_audio_url(media_url):
            return InputMediaAudio(media=media_url, caption=caption, parse_mode=parse_mode)
        if is_video_url(media_url):
            return InputMediaVideo(media=media_url, caption=caption, parse_mode=parse_mode)
        return InputMediaPhoto(media=media_url, caption=caption, parse_mode=parse_mode)

    async def save_outgoing_message(
        self,
        bot_id: int,
        tg_chat_id: int,
        tg_message: Message,
        fallback_type: MessageType,
        fallback_media_url: Optional[str],
        reply_to_message_id: Optional[int] = None,
    ) -> BotMessage:
        message_type = self.extract_message_type(tg_message, fallback_type)
        msg = BotMessage(
            bot_id=bot_id,
            telegram_message_id=tg_message.message_id,
            chat_id=tg_chat_id,
            user_id=None,
            message_type=message_type,
            text_content=tg_message.text or tg_message.caption,
            media_file_id=self.extract_media_file_id(tg_message, message_type),
            media_url=fallback_media_url,
            is_incoming=False,
            raw_data=tg_message.model_dump(),
            reply_to_message_id=reply_to_message_id,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def broadcast_new_message(self, owner_id: int, bot_id: int, tg_chat_id: int, message_id: int) -> None:
        await ws_manager.broadcast_chat_update(
            user_id=owner_id,
            bot_id=bot_id,
            chat_id=tg_chat_id,
            event_type="message_new",
            payload={"message_id": message_id},
        )

    async def resolve_media_url(self, bot_token: str, media_file_id: Optional[str]) -> Optional[str]:
        """Преобразовать file_id Telegram в прямой URL файла."""
        if not media_file_id:
            return None

        try:
            async with get_bot_session(bot_token) as client:
                tg_file = await client.get_file(media_file_id)
                if not tg_file.file_path:
                    raise HTTPException(status_code=404, detail="Media file not found")
                return f"https://api.telegram.org/file/bot{bot_token}/{tg_file.file_path}"
        except Exception as e:
            logger.error(f"Error resolving media URL for file_id={media_file_id}: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail="Failed to resolve media file")

    async def get_chat_and_bot(self, bot_id: int, tg_chat_id: int, owner_id: int):
        """Получить чат и бота с проверкой прав владельца."""
        query = select(DirectChat, Bot).join(Bot, DirectChat.bot_id == Bot.id).where(
            and_(
                DirectChat.bot_id == bot_id, 
                DirectChat.tg_chat_id == tg_chat_id,
                Bot.owner_id == owner_id
            )
        )
        row = (await self.db.execute(query)).first()
        if not row:
            raise HTTPException(status_code=404, detail="Chat not found or access denied")
        return row[0], row[1]

    async def send_message(self, bot_id: int, tg_chat_id: int, owner_id: int, request: SendMessageRequest) -> List[BotMessage]:
        """Отправить сообщение пользователю от лица бота."""
        chat, bot = await self.get_chat_and_bot(bot_id, tg_chat_id, owner_id)
        if not chat or not bot:
            return []

        reply_params = {}
        if request.reply_to_message_id:
            reply_params["reply_to_message_id"] = request.reply_to_message_id

        reply_markup = build_keyboard(request.buttons) if request.buttons else None

        media_urls = self.get_request_media_urls(request)
        tg_responses: List[Message] = []
        try:
            async with get_bot_session(bot.token) as client:
                if len(media_urls) > 1:
                    media_group = [
                        self.build_media_item(media_url, request.text_content if index == 0 else None)
                        for index, media_url in enumerate(media_urls[:10])
                    ]
                    tg_responses = list(await client.send_media_group(chat_id=tg_chat_id, media=media_group, **reply_params))
                elif len(media_urls) == 1:
                    media_url = media_urls[0]
                    message_type = request.media_type or self.detect_media_type(media_url)

                    if message_type == MessageType.PHOTO:
                        tg_responses = [await client.send_photo(chat_id=tg_chat_id, photo=media_url, caption=request.text_content, reply_markup=reply_markup, **reply_params)]
                    elif message_type == MessageType.VIDEO:
                        tg_responses = [await client.send_video(chat_id=tg_chat_id, video=media_url, caption=request.text_content, reply_markup=reply_markup, **reply_params)]
                    elif message_type == MessageType.DOCUMENT:
                        tg_responses = [await client.send_document(chat_id=tg_chat_id, document=media_url, caption=request.text_content, reply_markup=reply_markup, **reply_params)]
                    elif message_type == MessageType.AUDIO:
                        tg_responses = [await client.send_audio(chat_id=tg_chat_id, audio=media_url, caption=request.text_content, reply_markup=reply_markup, **reply_params)]
                    elif message_type == MessageType.VOICE:
                        tg_responses = [await client.send_voice(chat_id=tg_chat_id, voice=media_url, caption=request.text_content, reply_markup=reply_markup, **reply_params)]
                    elif message_type == MessageType.ANIMATION:
                        tg_responses = [await client.send_animation(chat_id=tg_chat_id, animation=media_url, caption=request.text_content, reply_markup=reply_markup, **reply_params)]
                    elif message_type == MessageType.STICKER:
                        tg_responses = [await client.send_sticker(chat_id=tg_chat_id, sticker=media_url, reply_markup=reply_markup, **reply_params)]
                    elif request.text_content:
                        tg_responses = [await client.send_message(chat_id=tg_chat_id, text=request.text_content, reply_markup=reply_markup, **reply_params)]
                    else:
                        return []
                elif request.text_content:
                    tg_responses = [await client.send_message(chat_id=tg_chat_id, text=request.text_content, reply_markup=reply_markup, **reply_params)]

            if not tg_responses:
                return []
        except Exception as e:
            logger.error(f"Error sending message via Direct API: {e}", exc_info=True)
            return []

        saved_messages: List[BotMessage] = []
        fallback_urls = media_urls[:10] if len(media_urls) > 1 else media_urls

        for index, tg_response in enumerate(tg_responses):
            fallback_url = fallback_urls[index] if index < len(fallback_urls) else None
            fallback_type = request.media_type or (self.detect_media_type(fallback_url) if fallback_url else MessageType.TEXT)
            saved_messages.append(
                await self.save_outgoing_message(
                    bot_id=bot.id,
                    tg_chat_id=tg_chat_id,
                    tg_message=tg_response,
                    fallback_type=fallback_type,
                    fallback_media_url=fallback_url,
                    reply_to_message_id=request.reply_to_message_id if index == 0 else None,
                )
            )

        await self.db.flush()
        for message in saved_messages:
            await self.db.refresh(message)
            await self.broadcast_new_message(owner_id, bot_id, tg_chat_id, message.id)

        return saved_messages

    async def edit_message(self, message_id: int, owner_id: int, request: EditMessageRequest) -> Optional[BotMessage]:
        """Редактировать исходящее сообщение в Telegram и БД."""
        query = select(BotMessage, Bot).join(Bot, BotMessage.bot_id == Bot.id).where(
            and_(BotMessage.id == message_id, Bot.owner_id == owner_id, BotMessage.is_incoming == False)
        )
        row = (await self.db.execute(query)).first()
        if not row:
            raise HTTPException(status_code=404, detail="Message not found or access denied")
        
        msg, bot = row[0], row[1]
        
        try:
            async with get_bot_session(bot.token) as client:
                if request.text_content:
                    if msg.message_type == MessageType.TEXT:
                        await client.edit_message_text(
                            text=request.text_content,
                            chat_id=msg.chat_id,
                            message_id=msg.telegram_message_id,
                        )
                    else:
                        await client.edit_message_caption(
                            caption=request.text_content,
                            chat_id=msg.chat_id,
                            message_id=msg.telegram_message_id,
                        )

                    msg.text_content = request.text_content
                    await self.db.flush()
                    await self.db.refresh(msg)

                    await ws_manager.broadcast_chat_update(
                        user_id=owner_id, bot_id=msg.bot_id, chat_id=msg.chat_id,
                        event_type="message_edited", payload={"message_id": msg.id}
                    )
        except Exception as e:
            logger.error(f"Error editing message via Direct API: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail="Failed to edit message")
            
        return msg

    async def delete_message(self, message_id: int, owner_id: int) -> bool:
        """Удалить исходящее сообщение в Telegram и БД."""
        query = select(BotMessage, Bot).join(Bot, BotMessage.bot_id == Bot.id).where(
            and_(BotMessage.id == message_id, Bot.owner_id == owner_id, BotMessage.is_incoming == False)
        )
        row = (await self.db.execute(query)).first()
        if not row:
            raise HTTPException(status_code=404, detail="Message not found or access denied")
            
        msg, bot = row[0], row[1]
        
        try:
            async with get_bot_session(bot.token) as client:
                await client.delete_message(chat_id=msg.chat_id, message_id=msg.telegram_message_id)
            await self.db.delete(msg)
            await self.db.flush()

            await ws_manager.broadcast_chat_update(
                user_id=owner_id, bot_id=msg.bot_id, chat_id=msg.chat_id,
                event_type="message_deleted", payload={"message_id": msg.id}
            )
            return True
        except Exception as e:
            logger.error(f"Error deleting message via Direct API: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail="Failed to delete message")

    async def save_incoming_message(self, bot_id: int, owner_id: int, message: Message | dict) -> Optional[BotMessage]:
        """Сохранить новое входящее сообщение из вебхука."""
        raw_data = self.get_raw_message_data(message)
        chat = self.message_get(message, "chat") or {}
        from_user = self.message_get(message, "from_user")
        if from_user is None:
            from_user = self.message_get(message, "from") or raw_data.get("from") or raw_data.get("from_user") or {}

        chat_id = self.extract_nested_id(chat) or self.extract_nested_id(raw_data.get("chat"))
        user_id = self.extract_nested_id(from_user) or self.extract_nested_id(raw_data.get("from")) or self.extract_nested_id(raw_data.get("from_user"))
        text = self.message_get(message, "text") or self.message_get(message, "caption")
        message_id = self.message_get(message, "message_id")
        if message_id is None:
            message_id = raw_data.get("message_id")

        bot = await self.db.get(Bot, bot_id)
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")

        msg_type, media_file_id = self.extract_incoming_media(message)

        media_url = await self.resolve_media_url(bot.token, media_file_id)

        reply_to = self.message_get(message, "reply_to_message")
        if reply_to is None:
            reply_to = raw_data.get("reply_to_message")
        reply_to_msg_id = self.extract_nested_id(reply_to, "message_id") if reply_to else None

        msg = BotMessage(
            bot_id=bot_id,
            telegram_message_id=message_id,
            chat_id=chat_id,
            user_id=user_id,
            message_type=msg_type,
            text_content=text,
            media_file_id=media_file_id,
            media_url=media_url,
            is_incoming=True,
            raw_data=raw_data,
            reply_to_message_id=reply_to_msg_id,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg