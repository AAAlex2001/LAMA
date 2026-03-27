from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, AutoReply


class BotAutoReplyService:
    """CRUD и поиск автоответов бота."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, bot_id: int, data, owner_id: Optional[int] = None,
    ) -> AutoReply:
        """Создать автоответ."""
        await self.ensure_bot_exists(bot_id, owner_id)

        auto_reply = AutoReply(
            bot_id=bot_id,
            keywords=data.keywords,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_urls=data.response_media_urls,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            scope=data.scope,
            is_active=data.is_active,
        )
        self.db.add(auto_reply)
        await self.db.flush()
        await self.db.refresh(auto_reply)
        return auto_reply

    async def get(self, auto_reply_id: int, owner_id: Optional[int] = None) -> AutoReply:
        """Получить автоответ по ID."""
        query = select(AutoReply).where(AutoReply.id == auto_reply_id)
        if owner_id is not None:
            query = query.join(BotModel, AutoReply.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        result = await self.db.execute(query)
        reply = result.scalar_one_or_none()
        if not reply:
            raise HTTPException(status_code=404, detail="Auto-reply not found")
        return reply

    async def get_list(
        self, bot_id: int,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[AutoReply], int]:
        """Получить список автоответов бота."""
        query = select(AutoReply).where(AutoReply.bot_id == bot_id)
        if owner_id is not None:
            query = query.join(BotModel, AutoReply.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        if is_active is not None:
            query = query.where(AutoReply.is_active == is_active)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        result = await self.db.execute(query.order_by(AutoReply.created_at.desc()))
        return list(result.scalars().all()), total

    async def update(
        self, auto_reply_id: int, data, owner_id: Optional[int] = None,
    ) -> Optional[AutoReply]:
        """Обновить автоответ."""
        auto_reply = await self.get(auto_reply_id, owner_id=owner_id)
        if not auto_reply:
            raise HTTPException(status_code=404, detail="Auto reply not found")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(auto_reply, field, value)

        auto_reply.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(auto_reply)
        return auto_reply

    async def delete(self, auto_reply_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить автоответ."""
        auto_reply = await self.get(auto_reply_id, owner_id=owner_id)
        if not auto_reply:
            raise HTTPException(status_code=404, detail="Auto reply not found")
        await self.db.delete(auto_reply)
        await self.db.flush()
        return True

    async def find_by_text(
        self, bot_id: int, text: str, chat_type: Optional[str] = None,
    ) -> Optional[AutoReply]:
        """Найти автоответ по тексту — streaming без загрузки всех в память."""
        query = select(AutoReply).where(
            AutoReply.bot_id == bot_id,
            AutoReply.is_active == True,
        )
        query = self.apply_scope_filter(query, chat_type)
        result = await self.db.execute(query)

        text_lower = text.lower()
        for reply in result.scalars():
            for keyword in reply.keywords:
                if keyword.lower() in text_lower:
                    return reply
        return None

    def apply_scope_filter(self, query, chat_type: Optional[str]):
        """Применить фильтр по scope для типа чата."""
        if not chat_type:
            return query
        if chat_type == "private":
            return query.where(
                (AutoReply.scope == "PRIVATE")
                | (AutoReply.scope == "ALL")
                | (AutoReply.scope.is_(None))
            )
        if chat_type in ("group", "supergroup"):
            return query.where(
                (AutoReply.scope == "GROUPS")
                | (AutoReply.scope == "ALL")
                | (AutoReply.scope.is_(None))
            )
        return query

    async def ensure_bot_exists(self, bot_id: int, owner_id: Optional[int]) -> None:
        """Проверить что бот существует."""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Bot not found")
