from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, BotCommand
from backend.schemas.bots import BotCommandCreate, BotCommandUpdate


class BotCommandService:
    """Сервис для работы с командами ботов"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_command(
        self,
        bot_id: int,
        data: BotCommandCreate,
        owner_id: Optional[int] = None
    ) -> BotCommand:
        """Создать команду"""
        # Проверяем существование бота
        query = select(BotModel).where(BotModel.id == bot_id)
        if owner_id is not None:
            query = query.where(BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        bot = result.scalar_one_or_none()
        if not bot:
            raise ValueError("Bot not found")

        # Проверяем, не существует ли уже команда
        check_query = select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == data.command
        )
        result = await self.db.execute(check_query)
        existing = result.scalar_one_or_none()

        if existing:
            raise ValueError(
                f"Command {data.command} already exists for this bot")

        command = BotCommand(
            bot_id=bot_id,
            command=data.command,
            description=data.description,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            scope=data.scope if hasattr(data, 'scope') else None,
            is_active=data.is_active
        )

        self.db.add(command)
        await self.db.commit()
        await self.db.refresh(command)

        return command

    async def get_command(self, command_id: int, owner_id: Optional[int] = None) -> Optional[BotCommand]:
        """Получить команду по ID"""
        query = select(BotCommand).where(BotCommand.id == command_id)
        if owner_id is not None:
            query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_commands(
        self,
        bot_id: int,
        is_active: Optional[bool] = None,
        owner_id: Optional[int] = None
    ) -> Tuple[List[BotCommand], int]:
        """Получить список команд бота"""
        base_query = select(BotCommand).where(BotCommand.bot_id == bot_id)
        if owner_id is not None:
            base_query = base_query.join(BotModel, BotCommand.bot_id == BotModel.id).where(
                BotModel.owner_id == owner_id)

        if is_active is not None:
            base_query = base_query.where(BotCommand.is_active == is_active)

        # Подсчёт
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Получение данных
        data_query = base_query.order_by(BotCommand.command)
        result = await self.db.execute(data_query)
        commands = list(result.scalars().all())

        return commands, total or 0

    async def update_command(
        self,
        command_id: int,
        data: BotCommandUpdate,
        owner_id: Optional[int] = None
    ) -> Optional[BotCommand]:
        """Обновить команду"""
        command = await self.get_command(command_id, owner_id=owner_id)
        if not command:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(command, field, value)

        command.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(command)

        return command

    async def delete_command(self, command_id: int, owner_id: Optional[int] = None) -> bool:
        """Удалить команду"""
        command = await self.get_command(command_id, owner_id=owner_id)
        if not command:
            return False

        await self.db.delete(command)
        await self.db.commit()
        return True

    async def find_command_by_text(
        self,
        bot_id: int,
        text: str,
        chat_type: Optional[str] = None
    ) -> Optional[BotCommand]:
        """
        Найти активную команду по тексту с учётом области работы
        
        Args:
            bot_id: ID бота
            text: Текст команды (например, "/start")
            chat_type: Тип чата ("private", "group", "supergroup", "channel")
        """
        query = select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == text,
            BotCommand.is_active == True
        )

        # Фильтруем по области работы, если указана
        if chat_type:
            if chat_type == "private":
                # В личных сообщениях работают команды с scope PRIVATE или ALL
                query = query.where(
                    (BotCommand.scope == "PRIVATE") |
                    (BotCommand.scope == "ALL") |
                    (BotCommand.scope.is_(None))  # Для обратной совместимости
                )
            elif chat_type in ("group", "supergroup"):
                # В группах работают команды с scope GROUPS или ALL
                query = query.where(
                    (BotCommand.scope == "GROUPS") |
                    (BotCommand.scope == "ALL") |
                    (BotCommand.scope.is_(None))  # Для обратной совместимости
                )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()
