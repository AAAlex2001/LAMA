"""Поиск активной команды по тексту с приоритетом channel-specific > generic."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import BotCommand
from backend.services.bot.features.commands.lookup import apply_scope_filter


class FindCommandByText:
    """С channel_id: предпочитает специфичную для канала команду, иначе generic.
    Без channel_id: только generic; если нет — единственная channel-specific (для DM)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        bot_id: int,
        text: str,
        chat_type: Optional[str] = None,
        channel_id: Optional[int] = None,
    ) -> Optional[BotCommand]:
        base_query = build_base_query(bot_id, text, chat_type)

        if channel_id is not None:
            return await find_with_channel_preference(self.db, base_query, channel_id)

        return await find_without_channel_context(self.db, base_query)


def build_base_query(bot_id: int, text: str, chat_type: Optional[str]):
    """Базовый SELECT: активные команды бота с указанным текстом + scope-фильтр."""
    query = select(BotCommand).where(
        BotCommand.bot_id == bot_id,
        BotCommand.command == text,
        BotCommand.is_active == True,
    )
    return apply_scope_filter(query, chat_type)


async def find_with_channel_preference(
    db: AsyncSession, base_query, channel_id: int,
) -> Optional[BotCommand]:
    """Сначала channel-specific, потом generic (channel_id IS NULL)."""
    specific = (await db.execute(
        base_query.where(BotCommand.channel_id == channel_id)
    )).scalar_one_or_none()
    if specific:
        return specific

    return (await db.execute(
        base_query.where(BotCommand.channel_id.is_(None))
    )).scalar_one_or_none()


async def find_without_channel_context(
    db: AsyncSession, base_query,
) -> Optional[BotCommand]:
    """DM-кейс: generic — приоритет; если нет, и есть единственная channel-specific — она."""
    generic = (await db.execute(
        base_query.where(BotCommand.channel_id.is_(None))
    )).scalar_one_or_none()
    if generic:
        return generic

    items = list((await db.execute(
        base_query
        .where(BotCommand.channel_id.is_not(None))
        .order_by(BotCommand.updated_at.desc())
        .limit(2)
    )).scalars().all())

    if len(items) == 1:
        return items[0]
    return None
