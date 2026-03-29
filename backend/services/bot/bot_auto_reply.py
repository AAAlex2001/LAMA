from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple

from sqlalchemy import select, func, cast, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, AutoReply, AutoReplyLog


class BotAutoReplyService:
    """CRUD и поиск автоответов бота."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, bot_id: int, data, owner_id: Optional[int] = None, channel_id: Optional[int] = None,
    ) -> AutoReply:
        """Создать автоответ."""
        await self.ensure_bot_exists(bot_id, owner_id)

        auto_reply = AutoReply(
            bot_id=bot_id,
            channel_id=channel_id,
            keywords=data.keywords,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_urls=data.response_media_urls,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            scope=data.scope,
            is_active=data.is_active,
            frequency_limit_minutes=data.frequency_limit_minutes,
            frequency_limit_type=data.frequency_limit_type,
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
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        channel_id: Optional[int] = None,
    ) -> Tuple[List[AutoReply], int]:
        """Получить список автоответов бота с пагинацией и поиском."""
        query = select(AutoReply).where(AutoReply.bot_id == bot_id)
        if owner_id is not None:
            query = query.join(BotModel, AutoReply.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        if channel_id is not None:
            query = query.where(AutoReply.channel_id == channel_id)
        if is_active is not None:
            query = query.where(AutoReply.is_active == is_active)
        if search:
            query = query.where(
                cast(cast(AutoReply.keywords, JSONB), Text).ilike(f"%{search}%")
            )

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        result = await self.db.execute(
            query.order_by(AutoReply.created_at.desc()).offset(skip).limit(limit)
        )
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
        self,
        bot_id: int,
        text: str,
        chat_type: Optional[str] = None,
        channel_id: Optional[int] = None,
        chat_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Optional[AutoReply]:
        """Найти автоответ по тексту с учётом частотного ограничения."""
        query = select(AutoReply).where(
            AutoReply.bot_id == bot_id,
            AutoReply.is_active == True,
        )
        if channel_id is not None:
            query = query.where(AutoReply.channel_id == channel_id)
        query = self.apply_scope_filter(query, chat_type)
        result = await self.db.execute(query)

        text_lower = text.lower()
        for reply in result.scalars():
            for keyword in reply.keywords:
                if keyword.lower() in text_lower:
                    if reply.frequency_limit_minutes and chat_id is not None:
                        allowed = await self._check_frequency(reply, chat_id, user_id)
                        if not allowed:
                            break
                    if chat_id is not None:
                        await self._log_trigger(reply.id, chat_id, user_id)
                    return reply
        return None

    async def _check_frequency(
        self, reply: AutoReply, chat_id: int, user_id: Optional[int],
    ) -> bool:
        """True = разрешено отправить. False = заблокировано частотным лимитом."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=reply.frequency_limit_minutes)
        query = select(func.count()).select_from(AutoReplyLog).where(
            AutoReplyLog.auto_reply_id == reply.id,
            AutoReplyLog.triggered_at >= cutoff,
        )
        if reply.frequency_limit_type == "per_user" and user_id is not None:
            query = query.where(AutoReplyLog.user_id == user_id)
        else:
            query = query.where(AutoReplyLog.chat_id == chat_id)

        count = (await self.db.execute(query)).scalar() or 0
        return count == 0

    async def _log_trigger(self, auto_reply_id: int, chat_id: int, user_id: Optional[int]) -> None:
        log = AutoReplyLog(
            auto_reply_id=auto_reply_id,
            chat_id=chat_id,
            user_id=user_id,
        )
        self.db.add(log)
        await self.db.flush()

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
