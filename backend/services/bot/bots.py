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
    MessageType,
    PendingApproval
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
from backend.services.bot.CRUD_bots import CRUDBotService
from backend.config import get_bot


class BotService:
    """Сервис для работы с ботами"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = CRUDBotService(db)
    
    def get_master_bot(self) -> Bot:
        """Получить мастер-бота из env"""
        return get_bot()

    # ========================================================================
    # CRUD операции для ботов
    # ========================================================================

    async def create_bot(self, data: BotCreate, owner_id: int) -> BotModel:
        """Создать бота по токену"""
        return await self.crud.create_bot(data, owner_id)

    async def get_bot(self, bot_id: int, owner_id: Optional[int] = None) -> Optional[BotModel]:
        """Получить бота по ID"""
        return await self.crud.get_bot(bot_id, owner_id)

    async def get_bot_by_telegram_id(self, telegram_id: int, owner_id: Optional[int] = None) -> Optional[BotModel]:
        """Получить бота по Telegram ID"""
        return await self.crud.get_bot_by_telegram_id(telegram_id, owner_id)

    async def get_bots(
        self,
        owner_id: Optional[int] = None,
        status: Optional[BotStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[BotModel], int]:
        """Получить список ботов с фильтрацией"""
        return await self.crud.get_bots(owner_id, status, skip, limit)

    async def update_bot(self, bot_id: int, data: BotUpdate, owner_id: int) -> Optional[BotModel]:
        """Обновить бота"""
        return await self.crud.update_bot(bot_id, data, owner_id)

    async def delete_bot(self, bot_id: int, owner_id: int) -> bool:
        """Удалить бота"""
        return await self.crud.delete_bot(bot_id, owner_id)

    async def sync_bot_from_telegram(self, token: str, owner_id: int) -> BotModel:
        """Синхронизировать информацию о боте через Telegram API"""
        return await self.crud.sync_bot_from_telegram(token, owner_id)

    # ========================================================================
    # Настройки приветствия
    # ========================================================================

    async def update_welcome_settings(
        self,
        bot_id: int,
        data: WelcomeSettingsUpdate,
        owner_id: Optional[int] = None
    ) -> Optional[BotModel]:
        """Обновить настройки приветствия"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
        if not bot:
            return None

        bot.welcome_enabled = data.welcome_enabled
        bot.welcome_message = data.welcome_message
        bot.welcome_media_url = data.welcome_media_url
        bot.welcome_media_type = data.welcome_media_type
        bot.welcome_buttons = data.welcome_buttons
        if data.join_captcha_enabled is not None:
            bot.join_captcha_enabled = data.join_captcha_enabled
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
        data: AutoApprovalUpdate,
        owner_id: Optional[int] = None
    ) -> Optional[BotModel]:
        """Обновить настройки автоодобрения"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
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
    ) -> tuple[bool, list[int]]:
        """
        Проверить критерии одобрения для пользователя
        
        Возвращает:
            tuple[bool, list[int]]: (должен_одобрить, список_каналов_где_не_подписан)
        """
        # AUTO режим - одобряем всех сразу
        if bot.auto_approval_mode == ApprovalMode.AUTO:
            return True, []

        # MANUAL режим - не одобряем автоматически
        if bot.auto_approval_mode == ApprovalMode.MANUAL:
            return False, []

        # Режим CRITERIA - проверяем критерии
        if not bot.approval_criteria:
            return False, []

        # Проверка подписки на другие каналы
        required_channels = bot.approval_criteria.get("required_channels", [])
        if required_channels:
            telegram_bot = self.get_master_bot()
            missing_channels = []  # Список каналов, на которые не подписан
            
            try:
                # Проходим по всем требуемым каналам
                for channel_id in required_channels:
                    try:
                        # Получаем информацию о членстве пользователя в канале
                        member = await telegram_bot.get_chat_member(channel_id, user_id)
                        # Проверяем статус: member, administrator, creator - это подписан
                        if member.status not in ["member", "administrator", "creator"]:
                            # Пользователь не подписан на этот канал
                            missing_channels.append(channel_id)
                    except TelegramAPIError:
                        # Если не удалось проверить - считаем что не подписан
                        missing_channels.append(channel_id)
                
                # Если есть каналы, на которые не подписан - не одобряем
                if missing_channels:
                    return False, missing_channels
                
                # Все проверки пройдены - одобряем
                return True, []
                
            except Exception:
                return False, required_channels  # Возвращаем все каналы как недоступные

        # Если нет требований к подпискам, но режим CRITERIA - требуется капча
        return False, []

    # ========================================================================
    # Работа с сообщениями
    # ========================================================================

    async def send_message(
        self,
        bot_id: int,
        data: SendMessageRequest,
        owner_id: Optional[int] = None
    ) -> Message:
        """Отправить сообщение от имени бота"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
        if not bot:
            raise ValueError("Bot not found")

        if bot.status != BotStatus.ACTIVE:
            raise ValueError("Bot is not active")

        # Используем мастер-бота для отправки сообщений
        telegram_bot = self.get_master_bot()

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
                raw_data=message.model_dump(mode="json")
            )

            return message

        except TelegramAPIError as e:
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
        data: BotCommandCreate,
        owner_id: Optional[int] = None
    ) -> BotCommand:
        """Создать команду"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
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

    async def get_command(self, command_id: int, owner_id: Optional[int] = None) -> Optional[BotCommand]:
        """Получить команду по ID"""
        query = select(BotCommand).where(BotCommand.id == command_id)
        if owner_id is not None:
            query = query.join(BotModel, BotCommand.bot_id == BotModel.id).where(BotModel.owner_id == owner_id)
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
            base_query = base_query.join(BotModel, BotCommand.bot_id == BotModel.id).where(BotModel.owner_id == owner_id)

        if is_active is not None:
            base_query = base_query.where(BotCommand.is_active == is_active)

        # Подсчёт
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Получение данных
        data_query = base_query.order_by(BotCommand.command)
        result = await self.db.execute(data_query)
        commands = list(result.scalars().all())

        return commands, total

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

    async def get_bot_stats(self, bot_id: int, owner_id: Optional[int] = None) -> Dict[str, Any]:
        """Получить статистику бота"""
        bot = await self.get_bot(bot_id, owner_id=owner_id)
        if not bot:
            raise ValueError("Bot not found")

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

    # ========================================================================
    # Работа с капчей и pending approvals теперь вынесена в CaptchaService
    # ========================================================================
