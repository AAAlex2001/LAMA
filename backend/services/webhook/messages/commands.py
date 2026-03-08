import logging
import os
from typing import Optional, Dict, Any

from aiogram.types import Message
from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.channel import ChannelAutoDeleteService
from backend.services.bot import BotCommandService, ModerationTriggerService, TriggerService, ShortcodeProcessor
from backend.models.bots import Bot as BotModel, TriggerType, MessageType
from backend.utils import build_keyboard
from backend.services.inbox.action_service import InboxActionService
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id

logger = logging.getLogger(__name__)

# Модерационные команды
MODERATION_COMMANDS = {
    "/admin", "/ban", "/unban", "/mute", "/unmute", "/delitetime"
}


class CommandProcessor:
    def __init__(
        self, db: AsyncSession, bot_model: BotModel, telegram_bot: Bot
    ):
        self.db = db
        self.bot_model = bot_model
        self.telegram_bot = telegram_bot
        self.trigger_service = TriggerService(db)

    def build_shortcode_context(self, message: Message) -> Dict[str, Any]:
        """Построить контекст для шорткодов"""
        from_user = message.from_user
        return {
            "user": {
                "id": from_user.id if from_user else None,
                "first_name": from_user.first_name if from_user else "",
                "username": from_user.username if from_user else None
            },
            "bot": {"first_name": self.bot_model.first_name}
        }

    async def send_response(
        self,
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
                MessageType.PHOTO: self.telegram_bot.send_photo,
                MessageType.VIDEO: self.telegram_bot.send_video,
                MessageType.DOCUMENT: self.telegram_bot.send_document,
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

        return await self.telegram_bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=reply_markup
        )

    async def send_command_response(self, message: Message, command) -> None:
        """Отправить ответ на команду"""
        context = self.build_shortcode_context(message)
        text = ShortcodeProcessor.process(command.response_text, context)

        await self.send_response(
            chat_id=message.chat.id,
            text=text,
            media_url=command.response_media_url,
            media_type=command.response_media_type,
            buttons=command.response_buttons,
        )

    async def process_command(
        self,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
        auto_delete_service: ChannelAutoDeleteService
    ) -> None:
        """Обработка команды"""
        command_text = text_content.split()[0]
        user_id = message.from_user.id if message.from_user else 0
        if command_text.lower() == "/start":
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

            keyboard = build_keyboard([[
                {"text": "🔐 Войти в Lama Planner", "url": login_url}
            ]])

            first_name = (
                message.from_user.first_name
                if message.from_user
                else "пользователь"
            )
            response_text = (
                f"👋 <b>Привет, {first_name}!</b>\n\n"
                f"Для того, чтобы войти в аккаунт, нажмите на кнопку ниже:"
            )

            await self.telegram_bot.send_message(
                chat_id=message.chat.id,
                text=response_text,
                parse_mode="HTML",
                reply_markup=keyboard,
                reply_to_message_id=message.message_id
            )

            await auto_delete_service.delete_if_command(
                self.telegram_bot, message
            )
            return

        if command_text.lower() in MODERATION_COMMANDS:
            moderation_trigger_service = ModerationTriggerService()
            handled = await moderation_trigger_service.handle_command(
                command=command_text,
                message=message,
                telegram_bot=self.telegram_bot,
            )

            try:
                inbox_service = InboxActionService(self.db)
                channel_obj = await get_channel_by_telegram_id(self.db, message.chat.id)
                channel_id = channel_obj.id if channel_obj else None
                cmd = command_text.lower()

                if cmd in ("/ban", "/mute", "/unban", "/unmute"):
                    target_user_id, target_name = moderation_trigger_service.extract_target(message)
                    parts = message.text.split() if message.text else []
                    duration_minutes = moderation_trigger_service.parse_time(
                        parts[-1] if len(parts) > 1 else "0"
                    )
                    is_unbanned = cmd in ("/unban", "/unmute")
                    ban_type = "mute" if cmd in ("/mute", "/unmute") else "ban"

                    await inbox_service.create_event(event_data={
                        "owner_id": self.bot_model.owner_id,
                        "category": InboxCategory.MODERATION,
                        "entity_type": EntityType.CHANNEL,
                        "event_type": EventType.CHANNEL_BAN,
                        "bot_id": self.bot_model.id,
                        "channel_id": channel_id,
                        "tg_user_id": target_user_id,
                        "tg_username": target_name,
                        "status": EventStatus.PROCESSED,
                        "description": (
                            f"{'Разбан' if is_unbanned else 'Бан'} "
                            f"{'(mute)' if ban_type == 'mute' else ''} "
                            f"{target_name or target_user_id} "
                            f"командой {command_text}"
                        ).strip(),
                        "payload": {
                            "ban_type": ban_type,
                            "is_unbanned": is_unbanned,
                            "duration_minutes": duration_minutes,
                            "command": command_text,
                            "chat_id": message.chat.id,
                            "message_id": message.message_id,
                            "issuer_user_id": message.from_user.id if message.from_user else None,
                            "issuer_username": message.from_user.username if message.from_user else None,
                        }
                    })
                else:
                    await inbox_service.create_event(event_data={
                        "owner_id": self.bot_model.owner_id,
                        "category": InboxCategory.AUTOMATION,
                        "entity_type": EntityType.BOT,
                        "event_type": EventType.BOT_COMMAND,
                        "bot_id": self.bot_model.id,
                        "channel_id": channel_id,
                        "tg_user_id": message.from_user.id if message.from_user else None,
                        "tg_username": message.from_user.username if message.from_user else None,
                        "status": EventStatus.PROCESSED if handled else EventStatus.NEW,
                        "description": f"Command {command_text} called in chat {message.chat.id}",
                        "payload": {
                            "command": command_text,
                            "full_text": text_content,
                            "message_id": message.message_id,
                            "chat_id": message.chat.id,
                            "handled": handled,
                        }
                    })
            except Exception as e:
                logger.error(f"Failed to create inbox event for command {command_text}: {e}", exc_info=True)

            if handled:
                await auto_delete_service.delete_if_command(
                    self.telegram_bot, message
                )
            return

        command_service = BotCommandService(self.db)
        command = await command_service.find_by_text(
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
                telegram_bot=self.telegram_bot,
                chat_type=message.chat.type if message.chat else None,
                context={"command": command_text}
            )

            await self.send_command_response(message, command)
            await auto_delete_service.delete_if_command(
                self.telegram_bot, message
            )
            return

        # Команда не найдена, но удаляем исходное сообщение
        await auto_delete_service.delete_if_command(
            self.telegram_bot, message
        )
