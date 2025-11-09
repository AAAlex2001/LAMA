"""
Обработка входящих сообщений ботов (polling)
"""
import asyncio
from typing import List, Optional
from datetime import datetime, timezone

from aiogram import Bot
from aiogram.types import Update, Message, ChatJoinRequest
from aiogram.exceptions import TelegramAPIError, TelegramRetryAfter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models.bots import Bot as BotModel, BotStatus, MessageType
from backend.services.bots import BotService


async def process_bot_updates():
    """
    Обработка обновлений для всех активных ботов
    Вызывается по расписанию (каждые 2-5 секунд для real-time эффекта)
    """
    async with AsyncSessionLocal() as db:
        try:
            # Получаем всех активных ботов
            query = select(BotModel).where(
                BotModel.status == BotStatus.ACTIVE,
                BotModel.is_webhook_enabled == False  # Только для polling
            )
            result = await db.execute(query)
            bots = result.scalars().all()

            if not bots:
                return

            # Обрабатываем каждого бота
            for bot_model in bots:
                try:
                    await process_single_bot(db, bot_model)
                except TelegramRetryAfter as e:
                    print(f"Rate limit for bot {bot_model.username}: retry after {e.retry_after}s")
                    await asyncio.sleep(e.retry_after)
                except Exception as e:
                    print(f"Error processing bot {bot_model.username}: {str(e)}")
                    # Помечаем бота как ERROR если слишком много ошибок
                    bot_model.status = BotStatus.ERROR
                    await db.commit()

        except Exception as e:
            print(f"Error in process_bot_updates: {str(e)}")
            await db.rollback()


async def process_single_bot(db: AsyncSession, bot_model: BotModel):
    """Обработка обновлений для одного бота"""
    telegram_bot = Bot(token=bot_model.token)
    service = BotService(db)

    try:
        # Получаем новые обновления
        updates: List[Update] = await telegram_bot.get_updates(
            offset=bot_model.last_update_id + 1,
            timeout=0,
            allowed_updates=[
                "message",
                "edited_message",
                "chat_join_request"
            ]
        )

        if not updates:
            await telegram_bot.session.close()
            return

        # Обрабатываем каждое обновление
        for update in updates:
            try:
                if update.message:
                    await handle_message(service, bot_model, update.message)
                elif update.edited_message:
                    await handle_message(service, bot_model, update.edited_message, is_edit=True)
                elif update.chat_join_request:
                    await handle_join_request(service, bot_model, telegram_bot, update.chat_join_request)

                # Обновляем last_update_id
                bot_model.last_update_id = update.update_id

            except Exception as e:
                print(f"Error handling update {update.update_id}: {str(e)}")

        # Сохраняем обновлённый offset
        await db.commit()

        # Подтверждаем обработку обновлений
        if updates:
            await telegram_bot.get_updates(
                offset=bot_model.last_update_id + 1,
                timeout=0
            )

    finally:
        await telegram_bot.session.close()


async def handle_message(
    service: BotService,
    bot_model: BotModel,
    message: Message,
    is_edit: bool = False
):
    """Обработка входящего сообщения"""
    # Определяем тип сообщения и медиа
    message_type = MessageType.TEXT
    media_file_id = None
    media_url = None
    text_content = message.text or message.caption

    if message.photo:
        message_type = MessageType.PHOTO
        media_file_id = message.photo[-1].file_id
    elif message.video:
        message_type = MessageType.VIDEO
        media_file_id = message.video.file_id
    elif message.document:
        message_type = MessageType.DOCUMENT
        media_file_id = message.document.file_id
    elif message.audio:
        message_type = MessageType.AUDIO
        media_file_id = message.audio.file_id
    elif message.voice:
        message_type = MessageType.VOICE
        media_file_id = message.voice.file_id
    elif message.sticker:
        message_type = MessageType.STICKER
        media_file_id = message.sticker.file_id
    elif message.animation:
        message_type = MessageType.ANIMATION
        media_file_id = message.animation.file_id

    # Сохраняем сообщение в БД
    await service.save_message(
        bot_id=bot_model.id,
        telegram_message_id=message.message_id,
        chat_id=message.chat.id,
        user_id=message.from_user.id if message.from_user else None,
        message_type=message_type,
        text_content=text_content,
        media_file_id=media_file_id,
        media_url=media_url,
        is_incoming=True,
        raw_data=message.model_dump(mode='json')  # mode='json' сериализует datetime в строки
    )

    # Проверяем, является ли это командой
    if text_content and text_content.startswith("/"):
        command_text = text_content.split()[0]  # Берём только команду без параметров
        command = await service.find_command_by_text(bot_model.id, command_text)

        if command:
            # Отправляем автоответ
            telegram_bot = Bot(token=bot_model.token)
            try:
                await send_command_response(telegram_bot, message.chat.id, command)
            finally:
                await telegram_bot.session.close()


async def handle_join_request(
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    join_request: ChatJoinRequest
):
    """Обработка заявки на вступление"""
    # Проверяем режим одобрения
    should_approve = await service.check_approval_criteria(
        bot_model,
        join_request.from_user.id
    )

    # Отправляем приветственное сообщение ТОЛЬКО для MANUAL режима
    # Telegram разрешает боту написать пользователю при получении join_request
    if not should_approve and bot_model.welcome_enabled and bot_model.welcome_message:
        try:
            message = await send_welcome_message(
                telegram_bot,
                join_request.from_user.id,  # Отправляем в личку пользователю
                bot_model
            )
            print(f"Sent welcome message to {join_request.from_user.id}")
            
            # Сохраняем отправленное сообщение в БД
            if message:
                await service.save_message(
                    bot_id=bot_model.id,
                    telegram_message_id=message.message_id,
                    chat_id=join_request.from_user.id,
                    user_id=join_request.from_user.id,
                    message_type=MessageType.TEXT,
                    text_content=bot_model.welcome_message,
                    media_file_id=None,
                    media_url=bot_model.welcome_media_url,
                    is_incoming=False,
                    raw_data=message.model_dump(mode='json')  # mode='json' сериализует datetime в строки
                )
        except TelegramAPIError as welcome_error:
            print(f"Failed to send welcome message: {str(welcome_error)}")

    # Одобряем заявку только если режим AUTO или CRITERIA
    if should_approve:
        try:
            await telegram_bot.approve_chat_join_request(
                chat_id=join_request.chat.id,
                user_id=join_request.from_user.id
            )
            print(f"Auto-approved join request from {join_request.from_user.id}")
        except TelegramAPIError as e:
            print(f"Failed to approve join request: {str(e)}")


async def send_command_response(telegram_bot: Bot, chat_id: int, command):
    """Отправить ответ на команду"""
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

    # Формируем inline keyboard если есть
    reply_markup = None
    if command.response_buttons:
        buttons = []
        for row in command.response_buttons.get("buttons", []):
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

    # Отправляем ответ
    if command.response_media_url and command.response_media_type:
        if command.response_media_type == MessageType.PHOTO:
            await telegram_bot.send_photo(
                chat_id=chat_id,
                photo=command.response_media_url,
                caption=command.response_text,
                reply_markup=reply_markup
            )
        elif command.response_media_type == MessageType.VIDEO:
            await telegram_bot.send_video(
                chat_id=chat_id,
                video=command.response_media_url,
                caption=command.response_text,
                reply_markup=reply_markup
            )
        elif command.response_media_type == MessageType.DOCUMENT:
            await telegram_bot.send_document(
                chat_id=chat_id,
                document=command.response_media_url,
                caption=command.response_text,
                reply_markup=reply_markup
            )
        else:
            await telegram_bot.send_message(
                chat_id=chat_id,
                text=command.response_text,
                reply_markup=reply_markup
            )
    else:
        await telegram_bot.send_message(
            chat_id=chat_id,
            text=command.response_text,
            reply_markup=reply_markup
        )


async def send_welcome_message(telegram_bot: Bot, chat_id: int, bot_model: BotModel):
    """Отправить приветственное сообщение"""
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message

    if not bot_model.welcome_message:
        return None

    # Формируем inline keyboard если есть
    reply_markup = None
    if bot_model.welcome_buttons:
        buttons = []
        for row in bot_model.welcome_buttons.get("buttons", []):
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

    # Отправляем приветствие и возвращаем Message
    message: Message
    if bot_model.welcome_media_url and bot_model.welcome_media_type:
        if bot_model.welcome_media_type == MessageType.PHOTO:
            message = await telegram_bot.send_photo(
                chat_id=chat_id,
                photo=bot_model.welcome_media_url,
                caption=bot_model.welcome_message,
                reply_markup=reply_markup
            )
        elif bot_model.welcome_media_type == MessageType.VIDEO:
            message = await telegram_bot.send_video(
                chat_id=chat_id,
                video=bot_model.welcome_media_url,
                caption=bot_model.welcome_message,
                reply_markup=reply_markup
            )
        else:
            message = await telegram_bot.send_message(
                chat_id=chat_id,
                text=bot_model.welcome_message,
                reply_markup=reply_markup
            )
    else:
        message = await telegram_bot.send_message(
            chat_id=chat_id,
            text=bot_model.welcome_message,
            reply_markup=reply_markup
        )
    
    return message

