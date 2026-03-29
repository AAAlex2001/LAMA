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

        channel_id = getattr(data, "channel_id", None)
        await self.ensure_command_unique(bot_id, data.command, channel_id=channel_id)

        action_type = getattr(data, "action_type", None) or "MESSAGE"
        claim_target = getattr(data, "claim_target", None)
        claim_channel_ids = getattr(data, "claim_channel_ids", None)

        if action_type == "CLAIM_ADMIN":
            claim_target = claim_target or "SPECIFIC_CHANNEL"
            if claim_target == "SPECIFIC_CHANNEL":
                if not claim_channel_ids:
                    raise HTTPException(status_code=400, detail="claim_channel_ids is required for SPECIFIC_CHANNEL")
                claim_channel_ids = list(claim_channel_ids)
            else:
                claim_channel_ids = None
        else:
            claim_target = None
            claim_channel_ids = None

        response_text = getattr(data, "response_text", None)
        if action_type == "MESSAGE":
            if not response_text or not str(response_text).strip():
                raise HTTPException(status_code=400, detail="response_text is required for MESSAGE commands")
        else:
            response_text = str(response_text).strip() if response_text is not None else " "

        command = BotCommand(
            bot_id=bot_id,
            channel_id=channel_id,
            command=data.command,
            description=data.description,
            response_text=response_text,
            response_media_url=data.response_media_url if action_type == "MESSAGE" else None,
            response_media_urls=data.response_media_urls if action_type == "MESSAGE" else None,
            response_media_type=data.response_media_type if action_type == "MESSAGE" else None,
            response_buttons=data.response_buttons if action_type == "MESSAGE" else None,
            scope=getattr(data, "scope", None),
            is_active=data.is_active,
            action_type=action_type,
            claim_target=claim_target,
            claim_channel_ids=claim_channel_ids if action_type == "CLAIM_ADMIN" else None,
        )
        self.db.add(command)
        await self.db.flush()
        await self.db.refresh(command)
        return command

    async def get(self, command_id: int, owner_id: Optional[int] = None) -> BotCommand:
        """Получить команду по ID."""
        query = select(BotCommand).where(BotCommand.id == command_id)
        if owner_id is not None:
            query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        result = await self.db.execute(query)
        command = result.scalar_one_or_none()
        if not command:
            raise HTTPException(status_code=404, detail="Command not found")
        return command

    async def get_list(
        self, bot_id: int,
        channel_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[BotCommand], int]:
        """Получить список команд бота."""
        query = select(BotCommand).where(BotCommand.bot_id == bot_id)
        if owner_id is not None:
            query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id,
            )
        if channel_id is not None:
            query = query.where(BotCommand.channel_id == channel_id)
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

        action_type = getattr(command, "action_type", None) or "MESSAGE"
        command.action_type = action_type

        if action_type == "MESSAGE":
            if not command.response_text or not str(command.response_text).strip():
                raise HTTPException(status_code=400, detail="response_text is required for MESSAGE commands")
            command.claim_target = None
            command.claim_channel_ids = None
        else:
            claim_target = getattr(command, "claim_target", None)
            if not claim_target:
                command.claim_target = "SPECIFIC_CHANNEL"
            claim_target = command.claim_target
            if claim_target == "SPECIFIC_CHANNEL":
                if not command.claim_channel_ids:
                    raise HTTPException(status_code=400, detail="claim_channel_ids is required for SPECIFIC_CHANNEL")
            else:
                command.claim_channel_ids = None

        command.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(command)
        return command

    async def delete(self, command_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить команду."""
        command = await self.get(command_id, owner_id=owner_id)
        if not command:
            raise HTTPException(status_code=404, detail="Command not found")
        await self.db.delete(command)
        await self.db.flush()
        return True

    async def find_by_text(
        self,
        bot_id: int,
        text: str,
        chat_type: Optional[str] = None,
        channel_id: Optional[int] = None,
    ) -> Optional[BotCommand]:
        """Найти активную команду по тексту с учётом scope и привязки к каналу."""
        base_query = select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == text,
            BotCommand.is_active == True,
        )
        base_query = self.apply_scope_filter(base_query, chat_type)

        if channel_id is not None:
            specific_query = base_query.where(BotCommand.channel_id == channel_id)
            result = await self.db.execute(specific_query)
            cmd = result.scalar_one_or_none()
            if cmd:
                return cmd

            generic_query = base_query.where(BotCommand.channel_id.is_(None))
            result = await self.db.execute(generic_query)
            return result.scalar_one_or_none()

        generic_query = base_query.where(BotCommand.channel_id.is_(None))
        result = await self.db.execute(generic_query)
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
            raise HTTPException(status_code=404, detail="Bot not found")

    async def ensure_command_unique(self, bot_id: int, command_text: str, channel_id: Optional[int]) -> None:
        """Проверить уникальность команды для конкретного канала."""
        result = await self.db.execute(
            select(BotCommand).where(
                BotCommand.bot_id == bot_id,
                BotCommand.command == command_text,
                BotCommand.channel_id == channel_id if channel_id is not None else BotCommand.channel_id.is_(None),
            ),
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=400, detail=f"Command {command_text} already exists for this bot")
