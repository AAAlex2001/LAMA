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


class BotService:
    """Сервис для работы с ботами"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = CRUDBotService(db)

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
            telegram_bot = Bot(token=bot.token)
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

                await telegram_bot.session.close()
                
                # Если есть каналы, на которые не подписан - не одобряем
                if missing_channels:
                    return False, missing_channels
                
                # Все проверки пройдены - одобряем
                return True, []
                
            except Exception:
                await telegram_bot.session.close()
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
                raw_data=message.model_dump(mode="json")
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
    # Работа с капчей и pending approvals
    # ========================================================================

    async def create_pending_approval(
            self,
            bot_id: int,
            user_id: int,
            chat_id: int,
            captcha_question: str,
            captcha_answer: str
    ) -> PendingApproval:
        """Создать запись ожидающей одобрения заявки с капчей"""
        from datetime import timedelta

        pending = PendingApproval(
            bot_id=bot_id,
            user_id=user_id,
            chat_id=chat_id,
            captcha_question=captcha_question,
            captcha_answer=captcha_answer,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
        )

        self.db.add(pending)
        await self.db.commit()
        await self.db.refresh(pending)

        return pending

    async def get_pending_approval(
            self,
            bot_id: int,
            user_id: int
    ) -> Optional[PendingApproval]:
        """Получить ожидающую заявку пользователя"""
        query = select(PendingApproval).where(
            PendingApproval.bot_id == bot_id,
            PendingApproval.user_id == user_id,
            PendingApproval.is_approved == False,
            PendingApproval.is_rejected == False
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def check_captcha_answer(
            self,
            pending_id: int,
            user_answer: str
    ) -> bool:
        """Проверить ответ на капчу"""
        query = select(PendingApproval).where(PendingApproval.id == pending_id)
        result = await self.db.execute(query)
        pending = result.scalar_one_or_none()

        if not pending:
            return False

        # Проверяем срок действия
        if pending.expires_at and datetime.now(timezone.utc) > pending.expires_at:
            pending.is_rejected = True
            await self.db.commit()
            return False

        # Увеличиваем счётчик попыток
        pending.attempts += 1

        # Проверяем ответ (регистронезависимо)
        if pending.captcha_answer.lower().strip() == user_answer.lower().strip():
            pending.is_approved = True
            await self.db.commit()
            return True
        else:
            # Если 3 неудачные попытки - отклоняем
            if pending.attempts >= 3:
                pending.is_rejected = True
            await self.db.commit()
            return False

    def generate_captcha(self) -> tuple[str, str]:
        """Генерировать простую математическую капчу"""
        import random

        # Генерируем простой пример: сложение двух чисел от 1 до 10
        num1 = random.randint(1, 10)
        num2 = random.randint(1, 10)
        answer = num1 + num2

        question = f"Сколько будет {num1} + {num2}?"

        return question, str(answer)
