"""
Сервис для работы с автоответами на ключевые слова
"""
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, AutoReply, MessageType
from backend.schemas.bots import AutoReplyCreate, AutoReplyUpdate


class AutoReplyService:
    """Сервис для работы с автоответами ботов"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_auto_reply(
        self,
        bot_id: int,
        data: AutoReplyCreate,
        owner_id: Optional[int] = None
    ) -> AutoReply:
        """Создать автоответ"""
        # Проверяем существование бота
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        bot = result.scalar_one_or_none()
        if not bot:
            raise ValueError("Bot not found")

        auto_reply = AutoReply(
            bot_id=bot_id,
            keywords=data.keywords,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            scope=data.scope,
            is_active=data.is_active
        )

        self.db.add(auto_reply)
        await self.db.commit()
        await self.db.refresh(auto_reply)

        return auto_reply

    async def get_auto_reply(self, auto_reply_id: int, owner_id: Optional[int] = None) -> Optional[AutoReply]:
        """Получить автоответ по ID"""
        query = select(AutoReply).where(AutoReply.id == auto_reply_id)
        if owner_id is not None:
            query = query.join(BotModel, AutoReply.bot_id == BotModel.id).where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_auto_replies(
        self,
        bot_id: int,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None
    ) -> Tuple[List[AutoReply], int]:
        """Получить список автоответов бота"""
        base_query = select(AutoReply).where(AutoReply.bot_id == bot_id)
        if owner_id is not None:
            base_query = base_query.join(BotModel, AutoReply.bot_id == BotModel.id).where(BotModel.owner_id == owner_id)

        if is_active is not None:
            base_query = base_query.where(AutoReply.is_active == is_active)

        # Подсчёт
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Получение данных
        data_query = base_query.order_by(AutoReply.created_at.desc())
        result = await self.db.execute(data_query)
        auto_replies = list(result.scalars().all())

        return auto_replies, total

    async def update_auto_reply(
        self,
        auto_reply_id: int,
        data: AutoReplyUpdate,
        owner_id: Optional[int] = None
    ) -> Optional[AutoReply]:
        """Обновить автоответ"""
        auto_reply = await self.get_auto_reply(auto_reply_id, owner_id=owner_id)
        if not auto_reply:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(auto_reply, field, value)

        auto_reply.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(auto_reply)

        return auto_reply

    async def delete_auto_reply(self, auto_reply_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить автоответ"""
        auto_reply = await self.get_auto_reply(auto_reply_id, owner_id=owner_id)
        if not auto_reply:
            return False

        await self.db.delete(auto_reply)
        await self.db.commit()
        return True

    async def find_auto_reply_by_text(
        self,
        bot_id: int,
        text: str,
        chat_type: Optional[str] = None
    ) -> Optional[AutoReply]:
        """
        Найти активный автоответ по тексту с учётом области работы
        
        Args:
            bot_id: ID бота
            text: Текст сообщения
            chat_type: Тип чата ("private", "group", "supergroup", "channel")
        """
        query = select(AutoReply).where(
            AutoReply.bot_id == bot_id,
            AutoReply.is_active == True
        )
        
        # Фильтруем по области работы, если указана
        if chat_type:
            if chat_type == "private":
                query = query.where(
                    (AutoReply.scope == "PRIVATE") | 
                    (AutoReply.scope == "ALL") |
                    (AutoReply.scope.is_(None))
                )
            elif chat_type in ("group", "supergroup"):
                query = query.where(
                    (AutoReply.scope == "GROUPS") | 
                    (AutoReply.scope == "ALL") |
                    (AutoReply.scope.is_(None))
                )
        
        result = await self.db.execute(query)
        auto_replies = list(result.scalars().all())
        
        # Ищем совпадение по ключевым словам
        text_lower = text.lower()
        for auto_reply in auto_replies:
            for keyword in auto_reply.keywords:
                if keyword.lower() in text_lower:
                    return auto_reply
        
        return None


