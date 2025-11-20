"""
Обработка входящих сообщений ботов (polling)
"""
import asyncio
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os

from aiogram import Bot
from aiogram.types import Update, Message, ChatJoinRequest, ChatPermissions
from aiogram.exceptions import TelegramAPIError, TelegramRetryAfter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models.bots import Bot as BotModel, BotStatus, MessageType, PendingApproval
from backend.services.bot import BotService, CaptchaService
from backend.services.channel import ChannelModerationService
from backend.models.channels import ActionType


def get_master_bot() -> Bot:
    """Получить мастер-бота из env"""
    master_bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not master_bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set in environment")
    return Bot(token=master_bot_token)


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
                "chat_join_request",
                "callback_query"
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
                elif update.callback_query:
                    await handle_callback_query(service, bot_model, telegram_bot, update.callback_query)

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
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    from backend.models.bots import ApprovalMode
    from backend.services.bot import CaptchaService
    
    # Проверяем режим одобрения
    should_approve, missing_channels = await service.check_approval_criteria(
        bot_model,
        join_request.from_user.id
    )

    # Если режим MANUAL - отправляем приветствие и/или капчу
    if bot_model.auto_approval_mode == ApprovalMode.MANUAL:
        # Приветственное сообщение
        if bot_model.welcome_enabled and bot_model.welcome_message:
            try:
                message = await send_welcome_message(
                    telegram_bot,
                    join_request.from_user.id,
                    bot_model
                )
                print(f"Sent welcome message to {join_request.from_user.id}")

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
                        raw_data=message.model_dump(mode='json')
                    )
            except TelegramAPIError as welcome_error:
                print(f"Failed to send welcome message: {str(welcome_error)}")

        # Капча
        if getattr(bot_model, "join_captcha_enabled", False):
            try:
                captcha_service = CaptchaService(service.db)
                question, answer = captcha_service.generate_captcha()
                pending = await captcha_service.create_pending_approval(
                    bot_id=bot_model.id,
                    user_id=join_request.from_user.id,
                    chat_id=join_request.chat.id,
                    captcha_question=question,
                    captcha_answer=answer,
                )

                # Генерируем варианты ответов (правильный + 2 случайных)
                import random

                correct = int(answer)
                options = {correct}
                while len(options) < 3:
                    delta = random.randint(1, 4)
                    options.add(correct + delta)
                options_list = list(options)
                random.shuffle(options_list)

                buttons = [
                    [
                        InlineKeyboardButton(
                            text=str(opt),
                            callback_data=f"captcha_{pending.id}_{opt}",
                        )
                    ]
                    for opt in options_list
                ]

                reply_markup = InlineKeyboardMarkup(inline_keyboard=buttons)

                await telegram_bot.send_message(
                    chat_id=join_request.from_user.id,
                    text=question,
                    reply_markup=reply_markup,
                )
                print(f"Sent captcha to {join_request.from_user.id}")
            except TelegramAPIError as captcha_error:
                print(f"Failed to send captcha: {str(captcha_error)}")
    
    # Если режим CRITERIA и проверки не пройдены
    elif bot_model.auto_approval_mode == ApprovalMode.CRITERIA and not should_approve:
        # Если есть каналы, на которые не подписан - отправляем ссылки
        if missing_channels:
            try:
                # Получаем информацию о каналах
                channel_buttons = []
                message_text = "📢 Для вступления необходимо подписаться на следующие каналы:\n\n"
                
                for idx, channel_id in enumerate(missing_channels, 1):
                    try:
                        chat = await telegram_bot.get_chat(channel_id)
                        channel_title = chat.title or f"Канал {idx}"
                        channel_username = chat.username
                        
                        if channel_username:
                            # Если у канала есть username - создаём ссылку
                            channel_url = f"https://t.me/{channel_username}"
                            message_text += f"{idx}. {channel_title}\n"
                            channel_buttons.append([
                                InlineKeyboardButton(
                                    text=f"📢 {channel_title}",
                                    url=channel_url
                                )
                            ])
                        else:
                            # Если нет username - просто указываем название
                            message_text += f"{idx}. {channel_title} (приватный канал)\n"
                    except TelegramAPIError:
                        message_text += f"{idx}. Канал ID: {channel_id}\n"
                
                message_text += "\n✅ После подписки подайте заявку снова!"
                
                reply_markup = InlineKeyboardMarkup(inline_keyboard=channel_buttons) if channel_buttons else None
                
                # Отправляем сообщение со ссылками
                await telegram_bot.send_message(
                    chat_id=join_request.from_user.id,
                    text=message_text,
                    reply_markup=reply_markup
                )
                print(f"Sent subscription requirements to {join_request.from_user.id}")
                
            except TelegramAPIError as e:
                print(f"Failed to send subscription requirements: {str(e)}")

    # Одобряем заявку только если режим AUTO или CRITERIA с пройденными проверками
    if should_approve:
        try:
            master_bot = get_master_bot()
            await master_bot.approve_chat_join_request(
                chat_id=join_request.chat.id,
                user_id=join_request.from_user.id
            )
            await master_bot.session.close()
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


async def handle_callback_query(
    service: BotService,
    bot_model: BotModel,
    telegram_bot: Bot,
    callback_query
):
    """Обработка нажатия на inline-кнопку (callback query)"""
    from aiogram.types import CallbackQuery
    
    # Получаем данные из callback
    user_id = callback_query.from_user.id
    callback_data = callback_query.data
    
    # Проверяем, это ответ на капчу
    if callback_data and callback_data.startswith("captcha_"):
        # Формат: captcha_{pending_id}_{answer}
        parts = callback_data.split("_")
        if len(parts) >= 3:
            try:
                pending_id = int(parts[1])
                user_answer = parts[2]
                
                # Проверяем ответ через сервис капчи
                captcha_service = CaptchaService(service.db)
                is_correct = await captcha_service.check_captcha_answer(pending_id, user_answer)
                
                if is_correct:
                    # Капча пройдена - одобряем заявку
                    query = select(PendingApproval).where(PendingApproval.id == pending_id)
                    result = await service.db.execute(query)
                    pending_approval = result.scalar_one_or_none()
                    
                    if pending_approval:
                        # Одобряем заявку в Telegram через мастер-бота
                        try:
                            master_bot = get_master_bot()
                            await master_bot.approve_chat_join_request(
                                chat_id=pending_approval.chat_id,
                                user_id=pending_approval.user_id
                            )
                            await master_bot.session.close()
                            
                            # Отправляем сообщение об успехе
                            await telegram_bot.answer_callback_query(
                                callback_query.id,
                                text="✅ Правильно! Заявка одобрена.",
                                show_alert=True
                            )
                            
                            # Отправляем приветственное сообщение
                            if bot_model.welcome_enabled and bot_model.welcome_message:
                                await send_welcome_message(telegram_bot, user_id, bot_model)
                                
                        except TelegramAPIError as e:
                            print(f"Failed to approve after captcha: {str(e)}")
                            await telegram_bot.answer_callback_query(
                                callback_query.id,
                                text="❌ Ошибка при одобрении заявки.",
                                show_alert=True
                            )
                else:
                    # Неправильный ответ
                    await telegram_bot.answer_callback_query(
                        callback_query.id,
                        text="❌ Неправильный ответ. Попробуйте ещё раз.",
                        show_alert=True
                    )
                    
            except Exception as e:
                print(f"Error processing captcha callback: {str(e)}")
                await telegram_bot.answer_callback_query(
                    callback_query.id,
                    text="❌ Ошибка обработки ответа.",
                    show_alert=True
                )
    else:
        # Другие типы callback - просто подтверждаем
        await telegram_bot.answer_callback_query(callback_query.id)

