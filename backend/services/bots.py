"""
Сервис для работы с ботами
"""
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message, ChatJoinRequest
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest, TelegramForbiddenError

from backend.models.bots import (
    Bot as BotModel,
    BotMessage,
    BotCommand,
    BotStatus,
    ApprovalMode,
    MessageType
)
from backend.schemas.bots import (
    BotCreate,
    BotUpdate,
    WelcomeSettingsUpdate,
    AutoApprovalUpdate,
    SendMessageRequest,
    BotCommandCreate,
    BotCommandUpdate
)


class BotService:
    """Сервис для работы с ботами"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # CRUD операции для ботов
    # ========================================================================

    async def create_bot(self, data: BotCreate) -> BotModel:
        """Создать бота по токену"""
        # Создаём временный экземпляр Bot для проверки токена
        try:
            temp_bot = Bot(token=data.token)
            bot_info = await temp_bot.get_me()
            await temp_bot.session.close()
        except TelegramAPIError as e:
            raise ValueError(f"Invalid bot token: {str(e)}")

        # Проверяем, не существует ли уже бот с таким telegram_id
        query = select(BotModel).where(BotModel.telegram_id == bot_info.id)
        result = await self.db.execute(query)
        existing_bot = result.scalar_one_or_none()

        if existing_bot:
            raise ValueError(f"Bot with telegram_id {bot_info.id} already exists")

        # Создаём бота в БД
        bot = BotModel(
            telegram_id=bot_info.id,
            username=bot_info.username,
            first_name=bot_info.first_name,
            token=data.token,
            description=data.description,
            status=BotStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc)
        )

        self.db.add(bot)
        await self.db.commit()
        await self.db.refresh(bot)

        return bot

    async def get_bot(self, bot_id: int) -> Optional[BotModel]:
        """Получить бота по ID"""
        query = select(BotModel).where(BotModel.id == bot_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_bot_by_telegram_id(self, telegram_id: int) -> Optional[BotModel]:
        """Получить бота по Telegram ID"""
        query = select(BotModel).where(BotModel.telegram_id == telegram_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_bots(
        self,
        status: Optional[BotStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[BotModel], int]:
        """Получить список ботов с фильтрацией"""
        query = select(BotModel)

        if status:
            query = query.where(BotModel.status == status)

        # Подсчёт общего количества
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных с пагинацией
        query = query.order_by(desc(BotModel.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        bots = list(result.scalars().all())

        return bots, total

    async def update_bot(self, bot_id: int, data: BotUpdate) -> Optional[BotModel]:
        """Обновить бота"""
        bot = await self.get_bot(bot_id)
        if not bot:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(bot, field, value)

        bot.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(bot)

        return bot

    async def delete_bot(self, bot_id: int) -> bool:
        """Удалить бота"""
        bot = await self.get_bot(bot_id)
        if not bot:
            return False

        await self.db.delete(bot)
        await self.db.commit()
        return True

    async def sync_bot_from_telegram(self, token: str) -> BotModel:
        """Синхронизировать информацию о боте через Telegram API"""
        try:
            temp_bot = Bot(token=token)
            bot_info = await temp_bot.get_me()
            await temp_bot.session.close()
        except TelegramAPIError as e:
            raise ValueError(f"Failed to sync bot: {str(e)}")

        # Ищем существующего бота
        bot = await self.get_bot_by_telegram_id(bot_info.id)

        if bot:
            # Обновляем существующего
            bot.username = bot_info.username
            bot.first_name = bot_info.first_name
            bot.token = token
            bot.last_sync_at = datetime.now(timezone.utc)
            bot.updated_at = datetime.now(timezone.utc)
        else:
            # Создаём нового
            bot = BotModel(
                telegram_id=bot_info.id,
                username=bot_info.username,
                first_name=bot_info.first_name,
                token=token,
                status=BotStatus.ACTIVE,
                last_sync_at=datetime.now(timezone.utc)
            )
            self.db.add(bot)

        await self.db.commit()
        await self.db.refresh(bot)

        return bot

    # ========================================================================
    # Настройки приветствия
    # ========================================================================

    async def update_welcome_settings(
        self,
        bot_id: int,
        data: WelcomeSettingsUpdate
    ) -> Optional[BotModel]:
        """Обновить настройки приветствия"""
        bot = await self.get_bot(bot_id)
        if not bot:
            return None

        bot.welcome_enabled = data.welcome_enabled
        bot.welcome_message = data.welcome_message
        bot.welcome_media_url = data.welcome_media_url
        bot.welcome_media_type = data.welcome_media_type
        bot.welcome_buttons = data.welcome_buttons
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(bot)

        return bot

    # ========================================================================
    # Настройки автоодобрения
    # ========================================================================

    async def update_auto_approval(
        self,
        bot_id: int,
        data: AutoApprovalUpdate
    ) -> Optional[BotModel]:
        """Обновить настройки автоодобрения"""
        bot = await self.get_bot(bot_id)
        if not bot:
            return None

        bot.auto_approval_mode = data.auto_approval_mode
        bot.approval_criteria = data.approval_criteria
        bot.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(bot)

        return bot

    async def check_approval_criteria(
        self,
        bot: BotModel,
        user_id: int
    ) -> bool:
        """Проверить критерии одобрения для пользователя"""
        if bot.auto_approval_mode == ApprovalMode.AUTO:
            return True

        if bot.auto_approval_mode == ApprovalMode.MANUAL:
            return False

        # Режим CRITERIA - проверяем критерии
        if not bot.approval_criteria:
            return False

        # Пример: проверка подписки на другие каналы
        required_channels = bot.approval_criteria.get("required_channels", [])
        if required_channels:
            # Здесь можно добавить логику проверки подписок
            # Пока возвращаем False для ручной обработки
            return False

        return True

    # ========================================================================
    # Работа с сообщениями
    # ========================================================================

    async def send_message(
        self,
        bot_id: int,
        data: SendMessageRequest
    ) -> Message:
        """Отправить сообщение от имени бота"""
        bot = await self.get_bot(bot_id)
        if not bot:
            raise ValueError("Bot not found")

        if bot.status != BotStatus.ACTIVE:
            raise ValueError("Bot is not active")

        # Создаём экземпляр Bot
        telegram_bot = Bot(token=bot.token)

        try:
            # Формируем inline keyboard если есть
            reply_markup = None
            if data.buttons:
                buttons = []
                for row in data.buttons.get("buttons", []):
                    button_row = []
                    for btn in row:
                        button_row.append(
                            InlineKeyboardButton(
                                text=btn["text"],
                                url=btn.get("url"),
                                callback_data=btn.get("callback_data")
                            )
                        )
                    buttons.append(button_row)
                reply_markup = InlineKeyboardMarkup(inline_keyboard=buttons)

            # Отправляем сообщение
            if data.media_url and data.media_type:
                if data.media_type == MessageType.PHOTO:
                    message = await telegram_bot.send_photo(
                        chat_id=data.chat_id,
                        photo=data.media_url,
                        caption=data.text_content,
                        reply_markup=reply_markup
                    )
                elif data.media_type == MessageType.VIDEO:
                    message = await telegram_bot.send_video(
                        chat_id=data.chat_id,
                        video=data.media_url,
                        caption=data.text_content,
                        reply_markup=reply_markup
                    )
                elif data.media_type == MessageType.DOCUMENT:
                    message = await telegram_bot.send_document(
                        chat_id=data.chat_id,
                        document=data.media_url,
                        caption=data.text_content,
                        reply_markup=reply_markup
                    )
                else:
                    message = await telegram_bot.send_message(
                        chat_id=data.chat_id,
                        text=data.text_content or "No content",
                        reply_markup=reply_markup
                    )
            else:
                message = await telegram_bot.send_message(
                    chat_id=data.chat_id,
                    text=data.text_content or "No content",
                    reply_markup=reply_markup
                )

            # Сохраняем сообщение в БД
            await self.save_message(
                bot_id=bot.id,
                telegram_message_id=message.message_id,
                chat_id=data.chat_id,
                user_id=None,
                message_type=data.media_type or MessageType.TEXT,
                text_content=data.text_content,
                media_file_id=getattr(message.photo[-1], "file_id", None) if message.photo else None,
                media_url=data.media_url,
                is_incoming=False,
                raw_data=message.model_dump()
            )

            await telegram_bot.session.close()
            return message

        except TelegramAPIError as e:
            await telegram_bot.session.close()
            raise ValueError(f"Failed to send message: {str(e)}")

    async def save_message(
        self,
        bot_id: int,
        telegram_message_id: int,
        chat_id: int,
        user_id: Optional[int],
        message_type: MessageType,
        text_content: Optional[str],
        media_file_id: Optional[str],
        media_url: Optional[str],
        is_incoming: bool,
        raw_data: Optional[Dict[str, Any]]
    ) -> BotMessage:
        """Сохранить сообщение в БД"""
        message = BotMessage(
            bot_id=bot_id,
            telegram_message_id=telegram_message_id,
            chat_id=chat_id,
            user_id=user_id,
            message_type=message_type,
            text_content=text_content,
            media_file_id=media_file_id,
            media_url=media_url,
            is_incoming=is_incoming,
            raw_data=raw_data
        )

        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)

        return message

    async def get_messages(
        self,
        bot_id: int,
        chat_id: Optional[int] = None,
        is_incoming: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[BotMessage], int]:
        """Получить список сообщений бота"""
        query = select(BotMessage).where(BotMessage.bot_id == bot_id)

        if chat_id is not None:
            query = query.where(BotMessage.chat_id == chat_id)

        if is_incoming is not None:
            query = query.where(BotMessage.is_incoming == is_incoming)

        # Подсчёт
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных
        query = query.order_by(desc(BotMessage.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        messages = list(result.scalars().all())

        return messages, total

    # ========================================================================
    # CRUD для команд
    # ========================================================================

    async def create_command(
        self,
        bot_id: int,
        data: BotCommandCreate
    ) -> BotCommand:
        """Создать команду"""
        bot = await self.get_bot(bot_id)
        if not bot:
            raise ValueError("Bot not found")

        # Проверяем, не существует ли уже команда
        query = select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == data.command
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            raise ValueError(f"Command {data.command} already exists for this bot")

        command = BotCommand(
            bot_id=bot_id,
            command=data.command,
            description=data.description,
            response_text=data.response_text,
            response_media_url=data.response_media_url,
            response_media_type=data.response_media_type,
            response_buttons=data.response_buttons,
            is_active=data.is_active
        )

        self.db.add(command)
        await self.db.commit()
        await self.db.refresh(command)

        return command

    async def get_command(self, command_id: int) -> Optional[BotCommand]:
        """Получить команду по ID"""
        query = select(BotCommand).where(BotCommand.id == command_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_commands(
        self,
        bot_id: int,
        is_active: Optional[bool] = None
    ) -> Tuple[List[BotCommand], int]:
        """Получить список команд бота"""
        query = select(BotCommand).where(BotCommand.bot_id == bot_id)

        if is_active is not None:
            query = query.where(BotCommand.is_active == is_active)

        # Подсчёт
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных
        query = query.order_by(BotCommand.command)
        result = await self.db.execute(query)
        commands = list(result.scalars().all())

        return commands, total

    async def update_command(
        self,
        command_id: int,
        data: BotCommandUpdate
    ) -> Optional[BotCommand]:
        """Обновить команду"""
        command = await self.get_command(command_id)
        if not command:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(command, field, value)

        command.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(command)

        return command

    async def delete_command(self, command_id: int) -> bool:
        """Удалить команду"""
        command = await self.get_command(command_id)
        if not command:
            return False

        await self.db.delete(command)
        await self.db.commit()
        return True

    async def find_command_by_text(
        self,
        bot_id: int,
        text: str
    ) -> Optional[BotCommand]:
        """Найти активную команду по тексту"""
        query = select(BotCommand).where(
            BotCommand.bot_id == bot_id,
            BotCommand.command == text,
            BotCommand.is_active == True
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    # ========================================================================
    # Статистика
    # ========================================================================

    async def get_bot_stats(self, bot_id: int) -> Dict[str, Any]:
        """Получить статистику бота"""
        # Общее количество сообщений
        total_messages_query = select(func.count()).where(BotMessage.bot_id == bot_id)
        total_messages_result = await self.db.execute(total_messages_query)
        total_messages = total_messages_result.scalar()

        # Входящие сообщения
        incoming_query = select(func.count()).where(
            BotMessage.bot_id == bot_id,
            BotMessage.is_incoming == True
        )
        incoming_result = await self.db.execute(incoming_query)
        incoming_messages = incoming_result.scalar()

        # Исходящие сообщения
        outgoing_messages = total_messages - incoming_messages

        # Команды
        total_commands_query = select(func.count()).where(BotCommand.bot_id == bot_id)
        total_commands_result = await self.db.execute(total_commands_query)
        total_commands = total_commands_result.scalar()

        active_commands_query = select(func.count()).where(
            BotCommand.bot_id == bot_id,
            BotCommand.is_active == True
        )
        active_commands_result = await self.db.execute(active_commands_query)
        active_commands = active_commands_result.scalar()

        # Последнее сообщение
        last_message_query = select(BotMessage.created_at).where(
            BotMessage.bot_id == bot_id
        ).order_by(desc(BotMessage.created_at)).limit(1)
        last_message_result = await self.db.execute(last_message_query)
        last_message_at = last_message_result.scalar_one_or_none()

        return {
            "bot_id": bot_id,
            "total_messages": total_messages,
            "incoming_messages": incoming_messages,
            "outgoing_messages": outgoing_messages,
            "total_commands": total_commands,
            "active_commands": active_commands,
            "last_message_at": last_message_at
        }
