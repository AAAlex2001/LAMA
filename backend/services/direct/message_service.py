from typing import Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.models.direct import DirectChat
from backend.models.bots import BotMessage, Bot, MessageType
from backend.schemas.bots.messages import SendMessageRequest
from backend.schemas.direct.message import EditMessageRequest
from backend.services.webhook.base import get_bot_session
from backend.websockets.manager import ws_manager

logger = logging.getLogger(__name__)

class DirectMessageService:
    """Сервис для работы с сообщениями в Директе."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

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

    async def send_message(self, bot_id: int, tg_chat_id: int, owner_id: int, request: SendMessageRequest) -> Optional[BotMessage]:
        """Отправить сообщение пользователю от лица бота."""
        chat, bot = await self._get_chat_and_bot(bot_id, tg_chat_id, owner_id)
        if not chat or not bot:
            return None

        tg_response = None
        try:
            async with get_bot_session(bot.token) as client:
                if request.media_url and request.media_type:
                    if request.media_type == MessageType.PHOTO:
                        tg_response = await client.send_photo(chat_id=tg_chat_id, photo=request.media_url, caption=request.text_content)
                elif request.text_content:
                    tg_response = await client.send_message(chat_id=tg_chat_id, text=request.text_content)

            if not tg_response:
                return None
        except Exception as e:
            logger.error(f"Error sending message via Direct API: {e}", exc_info=True)
            return None

        msg = BotMessage(
            bot_id=bot.id,
            telegram_message_id=tg_response.message_id,
            chat_id=tg_chat_id,
            user_id=None,
            message_type=request.media_type or MessageType.TEXT,
            text_content=request.text_content,
            media_url=request.media_url,
            is_incoming=False,
            raw_data=tg_response.model_dump()
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)

        await ws_manager.broadcast_chat_update(
            user_id=owner_id, bot_id=bot_id, chat_id=tg_chat_id,
            event_type="message_new", payload={"message_id": msg.id}
        )

        return msg

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

    async def save_incoming_message(self, bot_id: int, owner_id: int, message: dict) -> Optional[BotMessage]:
        """Сохранить новое входящее сообщение из вебхука."""
        chat_id = message.get("chat", {}).get("id")
        user_id = message.get("from", {}).get("id")
        text = message.get("text") or message.get("caption")
        message_id = message.get("message_id")
        
        msg_type = MessageType.TEXT
        media_file_id = None
        if "photo" in message:
            msg_type = MessageType.PHOTO
            photos = message["photo"]
            if photos:
                media_file_id = photos[-1].get("file_id")
        elif "video" in message:
            msg_type = MessageType.VIDEO
            media_file_id = message["video"].get("file_id")
        elif "document" in message:
            msg_type = MessageType.DOCUMENT
            media_file_id = message["document"].get("file_id")

        msg = BotMessage(
            bot_id=bot_id,
            telegram_message_id=message_id,
            chat_id=chat_id,
            user_id=user_id,
            message_type=msg_type,
            text_content=text,
            media_file_id=media_file_id,
            is_incoming=True,
            raw_data=message
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)

        await ws_manager.broadcast_chat_update(
            user_id=owner_id, bot_id=bot_id, chat_id=chat_id,
            event_type="message_new", payload={"message_id": msg.id}
        )
        return msg