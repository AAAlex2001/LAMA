"""
Обработчик сообщений и триггеров
"""
import asyncio
import logging
from typing import Optional, Dict, Any

from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, ChatPermissions
from aiogram.exceptions import TelegramAPIError
from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel import ChannelAutoDeleteService, ChannelNightModeService
from backend.services.bot import BotCommandService, CaptchaService
from backend.services.bot.auto_reply import AutoReplyService
from backend.services.bot.moderation_triggers import ModerationTriggerService
from backend.services.bot.triggers import TriggerService
from backend.services.bot.shortcodes import ShortcodeProcessor
from backend.services.webhook.welcome import WelcomeHandler
from backend.models.bots import Bot as BotModel, TriggerType, MessageType, CaptchaMode
from backend.services.webhook.base import get_bot_session, TELEGRAM_API_TIMEOUT
from backend.utils import build_keyboard

logger = logging.getLogger(__name__)

# Модерационные команды
MODERATION_COMMANDS = {"/admin", "/ban",
    "/unban", "/mute", "/unmute", "/delitetime"}


class MessageHandler:
    """Обработчик сообщений"""

    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model
        self.trigger_service = TriggerService(db)
        self.welcome_handler = WelcomeHandler(db, bot_model)

    async def process(self, message: Message) -> None:
        """Обработка сообщения"""
        text_content = message.text or message.caption
        chat_type = message.chat.type if message.chat else None

        try:
            async with get_bot_session() as telegram_bot:
                # Удаление системных сообщений
                auto_delete_service = ChannelAutoDeleteService(self.db)
                if await auto_delete_service.delete_if_system_message(telegram_bot, message):
                    return

                # Проверка ночного режима
                if await self.check_night_mode(telegram_bot, message):
                    return

                # Обработка добавления новых участников
                if message.new_chat_members:
                    await self.handle_new_members(telegram_bot, message)

                # Обработка ухода участников
                if message.left_chat_member:
                    await self.handle_member_left(telegram_bot, message)

                # Обработка текстового контента
                if text_content:
                    await self.process_text(
                        telegram_bot, message, text_content, chat_type, auto_delete_service
                    )

        except Exception as e:
            logger.error(f"Message processing error: {e}", exc_info=True)

    async def check_night_mode(self, telegram_bot: Bot, message: Message) -> bool:
        """Проверка ночного режима. Возвращает True, если сообщение заблокировано"""
        is_media = any([
            getattr(message, attr, None)
            for attr in ["photo", "video", "document", "audio", "voice", "sticker", "animation"]
        ])

        night_mode_service = ChannelNightModeService(self.db)
        should_block, notice = await night_mode_service.should_block_message(
            message.chat.id,
            is_media=is_media,
        )

        if should_block:
            try:
                await asyncio.wait_for(
                    telegram_bot.delete_message(
                        chat_id=message.chat.id,
                        message_id=message.message_id,
                    ),
                    timeout=TELEGRAM_API_TIMEOUT
                )
            except (TelegramAPIError, asyncio.TimeoutError):
                pass

            if notice:
                try:
                    await asyncio.wait_for(
                        telegram_bot.send_message(
                            chat_id=message.chat.id,
                            text=notice,
                        ),
                        timeout=TELEGRAM_API_TIMEOUT
                    )
                except (TelegramAPIError, asyncio.TimeoutError):
                    pass
            return True

        return False

    async def handle_new_members(self, telegram_bot: Bot, message: Message) -> None:
        """Обработка добавления новых участников - триггер MEMBER_JOINED"""
        try:
            bot_info = await telegram_bot.get_me()
            bot_id = bot_info.id
        except Exception:
            bot_id = None

        if not message.new_chat_members:
            return

        for new_member in message.new_chat_members:
            if bot_id and new_member.id == bot_id:
                logger.info(f"Skipping captcha for bot itself (id={bot_id})")
                continue

            captcha_mode = getattr(
                self.bot_model, "captcha_mode", CaptchaMode.DISABLED)
            if captcha_mode in (CaptchaMode.AFTER_JOIN, CaptchaMode.BOTH):
                await self.send_group_captcha(telegram_bot, message, new_member)
            else:
                await self.welcome_handler.handle_new_member(message, new_member)

            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.MEMBER_JOINED,
                user_id=new_member.id,
                chat_id=message.chat.id,
                telegram_bot=telegram_bot,
                chat_type=message.chat.type if message.chat else None,
                context={
                    "username": new_member.username,
                    "first_name": new_member.first_name,
                    "last_name": new_member.last_name,
                }
            )

    async def send_group_captcha(self, telegram_bot: Bot, message: Message, new_member) -> None:
        """Отправить капчу в группе после вступления"""
        import random

        try:
            captcha_service = CaptchaService(self.db)
            question, answer = captcha_service.generate_captcha()
            pending = await captcha_service.create_pending_approval(
                bot_id=self.bot_model.id,
                user_id=new_member.id,
                chat_id=message.chat.id,
                captcha_question=question,
                captcha_answer=answer,
            )

            try:
                await telegram_bot.restrict_chat_member(
                    chat_id=message.chat.id,
                    user_id=new_member.id,
                    permissions=ChatPermissions(
                        can_send_messages=False,
                        can_send_media_messages=False,
                        can_send_other_messages=False,
                        can_add_web_page_previews=False,
                    ),
                )
            except Exception:
                pass

            correct = int(answer)
            options = {correct}
            while len(options) < 3:
                options.add(correct + random.randint(-5, 5))
                if len(options) >= 10:
                    break

            options_list = list(options)[:3]
            random.shuffle(options_list)

            buttons = [[
                InlineKeyboardButton(
                    text=str(opt), callback_data=f"group_captcha_{pending.id}_{opt}")
            ] for opt in options_list]

            timeout_seconds = getattr(
                self.bot_model, "captcha_timeout_seconds", 10)

            captcha_text = (
                f"⚠️ {new_member.first_name}, реши капчу за {timeout_seconds} секунд, иначе будешь удалён!\n\n"
                f"{question}"
            )

            captcha_message = await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=captcha_text,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            )

            asyncio.create_task(
                self.captcha_timeout_kick(
                    telegram_bot,
                    message.chat.id,
                    new_member.id,
                    captcha_message.message_id,
                    pending.id,
                    timeout_seconds
                )
            )

        except Exception as e:
            logger.error(f"Failed to send group captcha: {e}", exc_info=True)

    async def captcha_timeout_kick(
        self,
        telegram_bot: Bot,
        chat_id: int,
        user_id: int,
        captcha_message_id: int,
        pending_id: int,
        timeout_seconds: int
    ) -> None:
        from sqlalchemy import select
        from backend.models.bots import PendingApproval

        await asyncio.sleep(timeout_seconds + 1)

        try:
            await self.db.rollback()
            query = select(PendingApproval).where(
                PendingApproval.id == pending_id)
            result = await self.db.execute(query)
            pending = result.scalar_one_or_none()

            if not pending or pending.is_approved:
                try:
                    await telegram_bot.delete_message(chat_id=chat_id, message_id=captcha_message_id)
                except TelegramAPIError:
                    pass
                return

            try:
                await telegram_bot.ban_chat_member(chat_id=chat_id, user_id=user_id)
                await telegram_bot.unban_chat_member(chat_id=chat_id, user_id=user_id)
                await telegram_bot.delete_message(chat_id=chat_id, message_id=captcha_message_id)
            except TelegramAPIError as e:
                logger.warning(f"Failed to kick user {user_id}: {e}")

        except Exception as e:
            logger.error(f"Captcha timeout check failed: {e}")

    async def handle_member_left(self, telegram_bot: Bot, message: Message) -> None:
        """Обработка ухода участника - триггер MEMBER_LEFT"""
        left_member = message.left_chat_member
        if not left_member:
            return

        await self.trigger_service.fire_event(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.MEMBER_LEFT,
            user_id=left_member.id,
            chat_id=message.chat.id,
            telegram_bot=telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={
                "username": left_member.username,
                "first_name": left_member.first_name,
                "last_name": left_member.last_name,
            }
        )

    async def process_text(
        self,
        telegram_bot: Bot,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        auto_delete_service: ChannelAutoDeleteService
    ) -> None:
        """Обработка текстового сообщения"""
        if text_content.startswith("/"):
            await self.process_command(
                telegram_bot, message, text_content, chat_type, auto_delete_service
            )
            return

        user_id = message.from_user.id if message.from_user else 0
        await self.trigger_service.fire_event(
            bot_id=self.bot_model.id,
            trigger_type=TriggerType.USER_MESSAGE,
            user_id=user_id,
            chat_id=message.chat.id,
            telegram_bot=telegram_bot,
            chat_type=message.chat.type if message.chat else None,
            context={"text": text_content[:100]}
        )

        auto_reply_service = AutoReplyService(self.db)
        auto_reply = await auto_reply_service.find_auto_reply_by_text(
            self.bot_model.id,
            text_content,
            chat_type=chat_type
        )

        if auto_reply:
            await self.send_auto_reply_response(telegram_bot, message, auto_reply)

    async def process_command(
        self,
        telegram_bot: Bot,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        auto_delete_service: ChannelAutoDeleteService
    ) -> None:
        """Обработка команды"""
        command_text = text_content.split()[0]
        user_id = message.from_user.id if message.from_user else 0
        if command_text.lower() == "/start":
            from backend.config import TELEGRAM_BOT_TOKEN
            from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
            import os

            # Получаем URL фронтенда
            frontend_url = os.getenv("FRONTEND_URL", "https://lamaplanner.com")

            # Создаём инлайн кнопку с параметрами пользователя
            login_url = f"{frontend_url}/login?tg_id={user_id}"

            if message.from_user and message.from_user.username:
                login_url += f"&username={message.from_user.username}"
            if message.from_user and message.from_user.first_name:
                login_url += f"&first_name={message.from_user.first_name}"
            if message.from_user and message.from_user.last_name:
                login_url += f"&last_name={message.from_user.last_name}"

            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="🔐 Войти в Lama Planner", url=login_url)]
            ])

            first_name = message.from_user.first_name if message.from_user else "пользователь"
            response_text = (
                f"👋 <b>Привет, {first_name}!</b>\n\n"
                f"Для того, чтобы войти в аккаунт, нажмите на кнопку ниже:"
            )

            await telegram_bot.send_message(
                chat_id=message.chat.id,
                text=response_text,
                parse_mode="HTML",
                reply_markup=keyboard,
                reply_to_message_id=message.message_id
            )

            await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        if command_text.lower() in MODERATION_COMMANDS:
            moderation_trigger_service = ModerationTriggerService(self.db)
            handled = await moderation_trigger_service.handle_moderation_command(
                command=command_text,
                message=message,
                telegram_bot=telegram_bot
            )

            if handled:
                await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        command_service = BotCommandService(self.db)
        command = await command_service.find_command_by_text(
            self.bot_model.id,
            command_text,
            chat_type=chat_type
        )

        if command:
            await self.trigger_service.fire_event(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.COMMAND_CALLED,
                user_id=user_id,
                chat_id=message.chat.id,
                telegram_bot=telegram_bot,
                chat_type=message.chat.type if message.chat else None,
                context={"command": command_text}
            )

            await self.send_command_response(telegram_bot, message, command)
            await auto_delete_service.delete_if_command_message(telegram_bot, message)
            return

        # Команда не найдена, но удаляем исходное сообщение
        await auto_delete_service.delete_if_command_message(telegram_bot, message)

    def build_shortcode_context(self, message: Message) -> Dict[str, Any]:
        """Построить контекст для шорткодов"""
        return {
            "user": {
                "id": message.from_user.id if message.from_user else None,
                "first_name": message.from_user.first_name if message.from_user else "",
                "username": message.from_user.username if message.from_user else None
            },
            "bot": {"first_name": self.bot_model.first_name}
        }

    async def send_response(
        self,
        telegram_bot: Bot,
        chat_id: int,
        text: str,
        media_url: Optional[str] = None,
        media_type: Optional[MessageType] = None,
        buttons: Optional[Dict[str, Any]] = None,
    ) -> Optional[Message]:
        """Универсальная отправка ответа (текст/медиа + кнопки)"""
        reply_markup = build_keyboard(buttons)

        if media_url and media_type:
            send_methods = {
                MessageType.PHOTO: telegram_bot.send_photo,
                MessageType.VIDEO: telegram_bot.send_video,
                MessageType.DOCUMENT: telegram_bot.send_document,
            }

            method = send_methods.get(media_type)
            if method:
                media_param = {
                    MessageType.PHOTO: "photo",
                    MessageType.VIDEO: "video",
                    MessageType.DOCUMENT: "document",
                }[media_type]

                return await method(
                    chat_id=chat_id,
                    **{media_param: media_url},
                    caption=text,
                    reply_markup=reply_markup
                )

        return await telegram_bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup
        )

    async def send_command_response(self, telegram_bot: Bot, message: Message, command) -> None:
        """Отправить ответ на команду"""
        context = self.build_shortcode_context(message)
        text = ShortcodeProcessor.process(command.response_text, context)

        await self.send_response(
            telegram_bot,
            chat_id=message.chat.id,
            text=text,
            media_url=command.response_media_url,
            media_type=command.response_media_type,
            buttons=command.response_buttons,
        )

    async def send_auto_reply_response(self, telegram_bot: Bot, message: Message, auto_reply) -> None:
        """Отправить автоответ"""
        context = self.build_shortcode_context(message)
        text = ShortcodeProcessor.process(auto_reply.response_text, context)

        await self.send_response(
            telegram_bot,
            chat_id=message.chat.id,
            text=text,
            media_url=auto_reply.response_media_url,
            media_type=auto_reply.response_media_type,
            buttons=auto_reply.response_buttons,
        )
