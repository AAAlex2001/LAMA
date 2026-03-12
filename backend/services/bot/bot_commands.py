from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotCommand


class BotCommandService:
    """CRUD и поиск команд бота."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, bot_id: int, data, owner_id: Optional[int] = None,
    ) -> BotCommand:
        """Создать команду."""
        await self.ensure_bot_exists(bot_id, owner_id)
        await self.ensure_command_unique(bot_id, data.command)

        command = BotCommand(
            bot_id=bot_id,
            command=data.command,
            description=data.description,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_urls=data.response_media_urls,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            scope=getattr(data, "scope", None),
            is_active=data.is_active,
        )
        self.db.add(command)
        await self.db.commit()
        await self.db.refresh(command)
        return command

    async def get(self, command_id: int, owner_id: Optional[int] = None) -> Optional[BotCommand]:
        """Получить команду по ID."""
        query = select(BotCommand).where(BotCommand.id == command_id)
        if owner_id is not None:
            query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_list(
        self, bot_id: int,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[BotCommand], int]:
        """Получить список команд бота."""
        query = select(BotCommand).where(BotCommand.bot_id == bot_id)
        if owner_id is not None:
            query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        if is_active is not None:
            query = query.where(BotCommand.is_active == is_active)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar() or 0

        result = await self.db.execute(query.order_by(BotCommand.command))
        return list(result.scalars().all()), total

    async def update(
        self, command_id: int, data, owner_id: Optional[int] = None,
    ) -> Optional[BotCommand]:
        """Обновить команду."""
        command = await self.get(command_id, owner_id=owner_id)
        if not command:
            raise HTTPException(status_code=404, detail="Command not found")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(command, field, value)

        command.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(command)
        return command

    async def delete(self, command_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить команду."""
        command = await self.get(command_id, owner_id=owner_id)
        if not command:
            return False
        await self.db.delete(command)
        await self.db.commit()
        return True

    async def find_by_text(
        self, bot_id: int, text: str, chat_type: Optional[str] = None,
    ) -> Optional[BotCommand]:
        """Найти активную команду по тексту с учётом scope."""
        query = select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == text,
            BotCommand.is_active == True,
        )
        query = self.apply_scope_filter(query, chat_type)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    def apply_scope_filter(self, query, chat_type: Optional[str]):
        """Применить фильтр по scope для типа чата."""
        if not chat_type:
            return query
        if chat_type == "private":
            return query.where(
                (BotCommand.scope == "PRIVATE")
                | (BotCommand.scope == "ALL")
                | (BotCommand.scope.is_(None))
            )
        if chat_type in ("group", "supergroup"):
            return query.where(
                (BotCommand.scope == "GROUPS")
                | (BotCommand.scope == "ALL")
                | (BotCommand.scope.is_(None))
            )
        return query

    async def ensure_bot_exists(self, bot_id: int, owner_id: Optional[int]) -> None:
        """Проверить что бот существует."""
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bot not found")

    async def ensure_command_unique(self, bot_id: int, command_text: str) -> None:
        """Проверить уникальность команды."""
        result = await self.db.execute(
            select(BotCommand).where(
                BotCommand.bot_id == bot_id,
                BotCommand.command == command_text,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Command {command_text} already exists for this bot")
