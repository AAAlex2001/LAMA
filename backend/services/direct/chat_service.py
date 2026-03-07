from typing import Tuple, List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from datetime import datetime, timezone

from backend.models.direct import DirectChat
from backend.models.bots import BotMessage, Bot, MessageType
from backend.schemas.direct.chat import DirectChatUpdate
from backend.websockets.manager import ws_manager

class DirectChatService:
    """Сервис для работы со списком чатов в Директе."""
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_chat(
        self,
        bot_id: int,
        tg_chat_id: int,
        tg_user_id: Optional[int] = None,
        tg_username: Optional[str] = None,
        tg_first_name: Optional[str] = None,
        tg_last_name: Optional[str] = None,
    ) -> DirectChat:
        """Получить существующий чат или создать новый."""
        query = select(DirectChat).where(
            and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id)
        )
        result = await self.db.execute(query)
        chat = result.scalar_one_or_none()

        if chat:
            needs_update = False
            if tg_username and chat.tg_username != tg_username:
                chat.tg_username = tg_username
                needs_update = True
            if tg_first_name and chat.tg_first_name != tg_first_name:
                chat.tg_first_name = tg_first_name
                needs_update = True
            if tg_last_name and chat.tg_last_name != tg_last_name:
                chat.tg_last_name = tg_last_name
                needs_update = True
            if needs_update:
                await self.db.commit()
                await self.db.refresh(chat)
            return chat

        new_chat = DirectChat(
            bot_id=bot_id,
            tg_chat_id=tg_chat_id,
            tg_user_id=tg_user_id,
            tg_username=tg_username,
            tg_first_name=tg_first_name,
            tg_last_name=tg_last_name,
        )
        self.db.add(new_chat)
        await self.db.commit()
        await self.db.refresh(new_chat)
        return new_chat

    async def get_chats_for_user(
        self,
        owner_id: int,
        skip: int = 0,
        limit: int = 50,
        bot_id: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Получить список чатов с превью последнего сообщения."""
        query = (
            select(DirectChat)
            .join(Bot, DirectChat.bot_id == Bot.id)
            .where(Bot.owner_id == owner_id)
        )

        if bot_id:
            query = query.where(DirectChat.bot_id == bot_id)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(desc(DirectChat.is_pinned), desc(DirectChat.updated_at))
        query = query.offset(skip).limit(limit)

        chats_result = await self.db.execute(query)
        chats = chats_result.scalars().all()

        enriched_chats = []
        for chat in chats:
            msg_query = select(BotMessage).where(
                and_(BotMessage.bot_id == chat.bot_id, BotMessage.chat_id == chat.tg_chat_id)
            ).order_by(desc(BotMessage.created_at)).limit(1)
            
            last_msg = (await self.db.execute(msg_query)).scalar_one_or_none()
            
            preview = None
            last_dt = None
            if last_msg:
                if last_msg.message_type == MessageType.TEXT:
                    preview = last_msg.text_content
                elif last_msg.message_type == MessageType.PHOTO:
                    preview = "🖼 Фотография"
                elif last_msg.message_type == MessageType.VIDEO:
                    preview = "🎥 Видео"
                elif last_msg.message_type == MessageType.DOCUMENT:
                    preview = "📄 Документ"
                else:
                    preview = "Медиа"
                last_dt = last_msg.created_at

            chat_dict = {
                "id": chat.id,
                "bot_id": chat.bot_id,
                "tg_chat_id": chat.tg_chat_id,
                "tg_user_id": chat.tg_user_id,
                "tg_username": chat.tg_username,
                "tg_first_name": chat.tg_first_name,
                "tg_last_name": chat.tg_last_name,
                "unread_count": chat.unread_count,
                "is_pinned": chat.is_pinned,
                "is_blocked": chat.is_blocked,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "last_message_preview": preview,
                "last_message_at": last_dt
            }
            enriched_chats.append(chat_dict)
            
        return enriched_chats, total

    async def get_chat_messages(
        self,
        bot_id: int,
        tg_chat_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[BotMessage], int]:
        """Получить историю сообщений в чате."""
        query = select(BotMessage).where(
            and_(BotMessage.bot_id == bot_id, BotMessage.chat_id == tg_chat_id)
        )
        
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
        messages = (await self.db.execute(query)).scalars().all()
        
        return list(messages), total

    async def update_chat_status(
        self,
        chat_id: int,
        owner_id: int,
        update_data: DirectChatUpdate
    ) -> Optional[DirectChat]:
        """Обновить статус чата (закрепление, блокировка, счетчик)."""
        query = select(DirectChat).join(Bot, DirectChat.bot_id == Bot.id).where(
            and_(DirectChat.id == chat_id, Bot.owner_id == owner_id)
        )
        chat = (await self.db.execute(query)).scalar_one_or_none()
        if not chat:
            return None

        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(chat, key, value)
            
        await self.db.commit()
        await self.db.refresh(chat)
        
        await ws_manager.broadcast_chat_update(
            user_id=owner_id, 
            bot_id=chat.bot_id, 
            chat_id=chat.tg_chat_id, 
            event_type="chat_updated", 
            payload={"action": "status_update", "chat_id": chat.id}
        )
        
        return chat

    async def increment_unread(self, bot_id: int, tg_chat_id: int) -> Optional[DirectChat]:
        """Увеличить счетчик непрочитанных сообщений."""
        query = select(DirectChat).where(
            and_(DirectChat.bot_id == bot_id, DirectChat.tg_chat_id == tg_chat_id)
        )
        chat = (await self.db.execute(query)).scalar_one_or_none()
        if chat:
            chat.unread_count += 1
            chat.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(chat)
            return chat
        return None