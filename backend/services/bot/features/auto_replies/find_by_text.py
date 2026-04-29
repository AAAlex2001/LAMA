"""Поиск активного автоответа по тексту с учётом frequency-лимита и логированием."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import AutoReply, AutoReplyLog
from backend.services.bot.features.auto_replies.lookup import apply_scope_filter


class FindAutoReplyByText:
    """Возвращает первое совпадение; учитывает scope/частоту/логирует срабатывание."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        text: str,
        chat_type: Optional[str] = None,
        channel_id: Optional[int] = None,
        chat_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Optional[AutoReply]:
        candidates = await fetch_candidates(self.db, bot_id, channel_id, chat_type)

        text_lower = text.lower()
        for reply in candidates:
            if not matches_keywords(reply, text_lower):
                continue

            if reply.frequency_limit_minutes and chat_id is not None:
                if not await is_allowed_by_frequency(self.db, reply, chat_id, user_id):
                    return None

            if chat_id is not None:
                await log_trigger(self.db, reply.id, chat_id, user_id)
            return reply
        return None


async def fetch_candidates(
    db: AsyncSession, bot_id: int, channel_id: Optional[int], chat_type: Optional[str],
) -> list[AutoReply]:
    """Активные автоответы бота с учётом scope и опц. фильтра по каналу."""
    query = select(AutoReply).where(
        AutoReply.bot_id == bot_id,
        AutoReply.is_active == True,
    )
    if channel_id is not None:
        query = query.where(AutoReply.channel_id == channel_id)
    query = apply_scope_filter(query, chat_type)
    return list((await db.execute(query)).scalars().all())


def matches_keywords(reply: AutoReply, text_lower: str) -> bool:
    """True если хотя бы одно ключевое слово содержится в тексте (case-insensitive)."""
    return any(keyword.lower() in text_lower for keyword in reply.keywords)


async def is_allowed_by_frequency(
    db: AsyncSession, reply: AutoReply, chat_id: int, user_id: Optional[int],
) -> bool:
    """True если в окне frequency_limit_minutes ещё не было срабатываний для этого target'а."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=reply.frequency_limit_minutes)
    query = select(func.count()).select_from(AutoReplyLog).where(
        AutoReplyLog.auto_reply_id == reply.id,
        AutoReplyLog.triggered_at >= cutoff,
    )
    if reply.frequency_limit_type == "per_user" and user_id is not None:
        query = query.where(AutoReplyLog.user_id == user_id)
    else:
        query = query.where(AutoReplyLog.chat_id == chat_id)

    return ((await db.execute(query)).scalar() or 0) == 0


async def log_trigger(
    db: AsyncSession, auto_reply_id: int, chat_id: int, user_id: Optional[int],
) -> None:
    """Запись AutoReplyLog для отслеживания частоты срабатываний."""
    db.add(AutoReplyLog(auto_reply_id=auto_reply_id, chat_id=chat_id, user_id=user_id))
    await db.flush()
