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
from backend.websockets.manager import ws_manager

logger = logging.getLogger(__name__)

class DirectMessageService:
    """Сервис для работы с сообщениями в Директе."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_request_media_urls(self, request: SendMessageRequest) -> List[str]:
        if request.media_urls:
            return [url for url in request.media_urls if url]
        if request.media_url:
            return [request.media_url]
        return []

    def _message_get(self, message: Message | dict, key: str, default: Any = None) -> Any:
        if isinstance(message, dict):
            return message.get(key, default)
        return getattr(message, key, default)

    def _extract_incoming_media(self, message: Message | dict) -> tuple[MessageType, Optional[str]]:
        photo = self._message_get(message, "photo")
        if photo:
            if isinstance(photo, list) and photo:
                last_photo = photo[-1]
                file_id = last_photo.get("file_id") if isinstance(last_photo, dict) else getattr(last_photo, "file_id", None)
                return MessageType.PHOTO, file_id
            return MessageType.PHOTO, None

        video = self._message_get(message, "video")
        if video:
            file_id = video.get("file_id") if isinstance(video, dict) else getattr(video, "file_id", None)
            return MessageType.VIDEO, file_id

        document = self._message_get(message, "document")
        if document:
            file_id = document.get("file_id") if isinstance(document, dict) else getattr(document, "file_id", None)
            return MessageType.DOCUMENT, file_id

        audio = self._message_get(message, "audio")
        if audio:
            file_id = audio.get("file_id") if isinstance(audio, dict) else getattr(audio, "file_id", None)
            return MessageType.AUDIO, file_id

        voice = self._message_get(message, "voice")
        if voice:
            file_id = voice.get("file_id") if isinstance(voice, dict) else getattr(voice, "file_id", None)
            return MessageType.VOICE, file_id

        animation = self._message_get(message, "animation")
        if animation:
            file_id = animation.get("file_id") if isinstance(animation, dict) else getattr(animation, "file_id", None)
            return MessageType.ANIMATION, file_id

        sticker = self._message_get(message, "sticker")
        if sticker:
            file_id = sticker.get("file_id") if isinstance(sticker, dict) else getattr(sticker, "file_id", None)
            return MessageType.STICKER, file_id

        return MessageType.TEXT, None

    def _detect_media_type(self, media_url: str) -> MessageType:
        if is_document_url(media_url):
            return MessageType.DOCUMENT
        if is_audio_url(media_url):
            return MessageType.AUDIO
        if is_video_url(media_url):
            return MessageType.VIDEO
        return MessageType.PHOTO

    def _extract_media_file_id(self, message: Message, message_type: MessageType) -> Optional[str]:
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
        return None

    def _extract_message_type(self, message: Message, fallback: MessageType = MessageType.TEXT) -> MessageType:
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

    def _build_media_item(self, media_url: str, caption: Optional[str]):
        parse_mode = ParseMode.HTML if caption else None

        if is_document_url(media_url):
            return InputMediaDocument(media=media_url, caption=caption, parse_mode=parse_mode)
        if is_audio_url(media_url):
            return InputMediaAudio(media=media_url, caption=caption, parse_mode=parse_mode)
        if is_video_url(media_url):
            return InputMediaVideo(media=media_url, caption=caption, parse_mode=parse_mode)
        return InputMediaPhoto(media=media_url, caption=caption, parse_mode=parse_mode)

    async def _save_outgoing_message(
        self,
        bot_id: int,
        tg_chat_id: int,
        tg_message: Message,
        fallback_type: MessageType,
        fallback_media_url: Optional[str],
    ) -> BotMessage:
        message_type = self._extract_message_type(tg_message, fallback_type)
        msg = BotMessage(
            bot_id=bot_id,
            telegram_message_id=tg_message.message_id,
            chat_id=tg_chat_id,
            user_id=None,
            message_type=message_type,
            text_content=tg_message.text or tg_message.caption,
            media_file_id=self._extract_media_file_id(tg_message, message_type),
            media_url=fallback_media_url,
            is_incoming=False,
            raw_data=tg_message.model_dump(),
        )
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def _broadcast_new_message(self, owner_id: int, bot_id: int, tg_chat_id: int, message_id: int) -> None:
        await ws_manager.broadcast_chat_update(
            user_id=owner_id,
            bot_id=bot_id,
            chat_id=tg_chat_id,
            event_type="message_new",
            payload={"message_id": message_id},
        )

    async def _resolve_media_url(self, bot_token: str, media_file_id: Optional[str]) -> Optional[str]:
        """Преобразовать file_id Telegram в прямой URL файла."""
        if not media_file_id:
            return None

        try:
            async with get_bot_session(bot_token) as client:
                tg_file = await client.get_file(media_file_id)
                if not tg_file.file_path:
                    return None
                return f"https://api.telegram.org/file/bot{bot_token}/{tg_file.file_path}"
        except Exception as e:
            logger.error(f"Error resolving media URL for file_id={media_file_id}: {e}", exc_info=True)
            return None

    async def _get_chat_and_bot(self, bot_id: int, tg_chat_id: int, owner_id: int):
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
            return None, None
        return row[0], row[1]

    async def send_message(self, bot_id: int, tg_chat_id: int, owner_id: int, request: SendMessageRequest) -> List[BotMessage]:
        """Отправить сообщение пользователю от лица бота."""
        chat, bot = await self._get_chat_and_bot(bot_id, tg_chat_id, owner_id)
        if not chat or not bot:
            return []

        media_urls = self._get_request_media_urls(request)
        tg_responses: List[Message] = []
        try:
            async with get_bot_session(bot.token) as client:
                if len(media_urls) > 1:
                    media_group = [
                        self._build_media_item(media_url, request.text_content if index == 0 else None)
                        for index, media_url in enumerate(media_urls[:10])
                    ]
                    tg_responses = list(await client.send_media_group(chat_id=tg_chat_id, media=media_group))
                elif len(media_urls) == 1:
                    media_url = media_urls[0]
                    message_type = request.media_type or self._detect_media_type(media_url)

                    if message_type == MessageType.PHOTO:
                        tg_responses = [await client.send_photo(chat_id=tg_chat_id, photo=media_url, caption=request.text_content)]
                    elif message_type == MessageType.VIDEO:
                        tg_responses = [await client.send_video(chat_id=tg_chat_id, video=media_url, caption=request.text_content)]
                    elif message_type == MessageType.DOCUMENT:
                        tg_responses = [await client.send_document(chat_id=tg_chat_id, document=media_url, caption=request.text_content)]
                    elif message_type == MessageType.AUDIO:
                        tg_responses = [await client.send_audio(chat_id=tg_chat_id, audio=media_url, caption=request.text_content)]
                    elif message_type == MessageType.VOICE:
                        tg_responses = [await client.send_voice(chat_id=tg_chat_id, voice=media_url, caption=request.text_content)]
                    elif message_type == MessageType.ANIMATION:
                        tg_responses = [await client.send_animation(chat_id=tg_chat_id, animation=media_url, caption=request.text_content)]
                    elif message_type == MessageType.STICKER:
                        tg_responses = [await client.send_sticker(chat_id=tg_chat_id, sticker=media_url)]
                    elif request.text_content:
                        tg_responses = [await client.send_message(chat_id=tg_chat_id, text=request.text_content)]
                    else:
                        return []
                elif request.text_content:
                    tg_responses = [await client.send_message(chat_id=tg_chat_id, text=request.text_content)]

            if not tg_responses:
                return []
        except Exception as e:
            logger.error(f"Error sending message via Direct API: {e}", exc_info=True)
            return []

        saved_messages: List[BotMessage] = []
        fallback_urls = media_urls[:10] if len(media_urls) > 1 else media_urls

        for index, tg_response in enumerate(tg_responses):
            fallback_url = fallback_urls[index] if index < len(fallback_urls) else None
            fallback_type = request.media_type or (self._detect_media_type(fallback_url) if fallback_url else MessageType.TEXT)
            saved_messages.append(
                await self._save_outgoing_message(
                    bot_id=bot.id,
                    tg_chat_id=tg_chat_id,
                    tg_message=tg_response,
                    fallback_type=fallback_type,
                    fallback_media_url=fallback_url,
                )
            )

        await self.db.commit()
        for message in saved_messages:
            await self.db.refresh(message)
            await self._broadcast_new_message(owner_id, bot_id, tg_chat_id, message.id)

        return saved_messages

    async def edit_message(self, message_id: int, owner_id: int, request: EditMessageRequest) -> Optional[BotMessage]:
        """Редактировать исходящее сообщение в Telegram и БД."""
        query = select(BotMessage, Bot).join(Bot, BotMessage.bot_id == Bot.id).where(
            and_(BotMessage.id == message_id, Bot.owner_id == owner_id, BotMessage.is_incoming == False)
        )
        row = (await self.db.execute(query)).first()
        if not row:
            return None
        
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
                    await self.db.commit()
                    await self.db.refresh(msg)

                    await ws_manager.broadcast_chat_update(
                        user_id=owner_id, bot_id=msg.bot_id, chat_id=msg.chat_id,
                        event_type="message_edited", payload={"message_id": msg.id}
                    )
        except Exception as e:
            logger.error(f"Error editing message via Direct API: {e}", exc_info=True)
            return None
            
        return msg

    async def delete_message(self, message_id: int, owner_id: int) -> bool:
        """Удалить исходящее сообщение в Telegram и БД."""
        query = select(BotMessage, Bot).join(Bot, BotMessage.bot_id == Bot.id).where(
            and_(BotMessage.id == message_id, Bot.owner_id == owner_id, BotMessage.is_incoming == False)
        )
        row = (await self.db.execute(query)).first()
        if not row:
            return False
            
        msg, bot = row[0], row[1]
        
        try:
            async with get_bot_session(bot.token) as client:
                await client.delete_message(chat_id=msg.chat_id, message_id=msg.telegram_message_id)
            await self.db.delete(msg)
            await self.db.commit()

            await ws_manager.broadcast_chat_update(
                user_id=owner_id, bot_id=msg.bot_id, chat_id=msg.chat_id,
                event_type="message_deleted", payload={"message_id": msg.id}
            )
            return True
        except Exception as e:
            logger.error(f"Error deleting message via Direct API: {e}", exc_info=True)
            return False

    async def save_incoming_message(self, bot_id: int, owner_id: int, message: Message | dict) -> Optional[BotMessage]:
        """Сохранить новое входящее сообщение из вебхука."""
        chat = self._message_get(message, "chat") or {}
        from_user = self._message_get(message, "from_user")
        if from_user is None:
            from_user = self._message_get(message, "from") or {}

        chat_id = chat.get("id") if isinstance(chat, dict) else getattr(chat, "id", None)
        user_id = from_user.get("id") if isinstance(from_user, dict) else getattr(from_user, "id", None)
        text = self._message_get(message, "text") or self._message_get(message, "caption")
        message_id = self._message_get(message, "message_id")
        raw_data = message if isinstance(message, dict) else message.model_dump()

        bot = await self.db.get(Bot, bot_id)
        if not bot:
            return None

        msg_type, media_file_id = self._extract_incoming_media(message)

        media_url = await self._resolve_media_url(bot.token, media_file_id)

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
            raw_data=raw_data
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)

        await ws_manager.broadcast_chat_update(
            user_id=owner_id, bot_id=bot_id, chat_id=chat_id,
            event_type="message_new", payload={"message_id": msg.id}
        )
        return msg