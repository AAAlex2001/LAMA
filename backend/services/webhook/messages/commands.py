import logging
import os
from typing import Optional, List, Dict, Any

from aiogram.types import Message, InputMediaPhoto, InputMediaVideo, InputMediaDocument
from backend.services.telegram_client import RateLimitedBot
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.bot import BotCommandService, ModerationTriggerService, TriggerService, ShortcodeProcessor
from backend.models.bots import Bot as BotModel, TriggerType, MessageType, BotMessage
from backend.utils import build_keyboard
from backend.services.direct.message_service import DirectMessageService
from backend.services.inbox.event_service import InboxEventService
from backend.schemas.inbox.enums import InboxCategory, EntityType, EventType, EventStatus
from backend.schemas.inbox.events import InboxEventCreate
from backend.services.channel.utils.query_utils import get_channel_by_telegram_id, get_channel
from backend.celery.tasks import send_claim_messages, send_claim_to_admins
from backend.utils.media import is_video_url, is_document_url

logger = logging.getLogger(__name__)

# Модерационные команды
MODERATION_COMMANDS = {
    "/admin", "/ban", "/unban", "/mute", "/unmute", "/delitetime"
}


class CommandProcessor:
    def __init__(
        self, db: AsyncSession, bot_model: BotModel, telegram_bot: RateLimitedBot
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

    def normalize_command(self, command_text: str) -> str:
        """Нормализовать команду вида /cmd@botname -> /cmd."""
        normalized = command_text.strip().lower()
        bot_username = (self.bot_model.username or "").lower()

        if bot_username and normalized.endswith(f"@{bot_username}"):
            return normalized[: -(len(bot_username) + 1)]

        return normalized

    async def save_system_message(self, chat_id: int, text: str) -> None:
        """Сохранить системное сообщение в БД (для DM чатов)."""
        msg = BotMessage(
            bot_id=self.bot_model.id,
            telegram_message_id=0,
            chat_id=chat_id,
            user_id=None,
            message_type=MessageType.TEXT,
            text_content=text,
            is_incoming=False,
            is_system=True,
        )
        self.db.add(msg)
        await self.db.flush()

    async def save_outgoing_if_dm(
        self,
        chat_id: int,
        tg_message: Optional[Message],
        fallback_type: MessageType,
        fallback_media_url: Optional[str],
    ) -> None:
        """Сохранить исходящее сообщение бота в BotMessage (только DM)."""
        if not tg_message or chat_id <= 0:
            return
        try:
            direct_service = DirectMessageService(self.db)
            await direct_service.save_outgoing_message(
                bot_id=self.bot_model.id,
                tg_chat_id=chat_id,
                tg_message=tg_message,
                fallback_type=fallback_type,
                fallback_media_url=fallback_media_url,
            )
            await self.db.flush()
        except Exception as e:
            logger.error(f"Failed to save outgoing command response: {e}", exc_info=True)

    def get_chat_display_name(self, message: Message) -> str:
        """Получить читаемое имя чата для описания события."""
        if message.chat.type == "private":
            if message.from_user and message.from_user.username:
                return f"личный чат с @{message.from_user.username}"
            if message.from_user and message.from_user.full_name:
                return f"личный чат с {message.from_user.full_name}"
            return "личный чат"

        if message.chat.title:
            return f'чат "{message.chat.title}"'

        if message.chat.username:
            return f"чат @{message.chat.username}"

        return f"чат {message.chat.id}"

    async def resolve_channel(self, chat_id: int):
        """Получить канал по telegram_id (кешируется на время обработки)."""
        if not hasattr(self, 'resolved_channels'):
            self.resolved_channels = {}
        if chat_id not in self.resolved_channels:
            self.resolved_channels[chat_id] = await get_channel_by_telegram_id(self.db, chat_id)
        return self.resolved_channels[chat_id]

    async def create_command_inbox_event(
        self,
        message: Message,
        command_text: str,
        text_content: str,
        handled: bool,
    ) -> None:
        """Записать использование команды в inbox."""
        event_service = InboxEventService(self.db)
        channel_obj = await self.resolve_channel(message.chat.id)
        channel_id = channel_obj.id if channel_obj else None
        chat_name = self.get_chat_display_name(message)

        await event_service.create_event(InboxEventCreate(
            owner_id=self.bot_model.owner_id,
            category=InboxCategory.AUTOMATION,
            entity_type=EntityType.BOT,
            event_type=EventType.BOT_COMMAND,
            bot_id=self.bot_model.id,
            channel_id=channel_id,
            tg_user_id=message.from_user.id if message.from_user else None,
            tg_username=message.from_user.username if message.from_user else None,
            status=EventStatus.NEW,
            description=f"Команда {command_text} вызвана в {chat_name}",
            payload={
                "command": command_text,
                "full_text": text_content,
                "message_id": message.message_id,
                "chat_id": message.chat.id,
                "chat_title": message.chat.title,
                "chat_username": message.chat.username,
                "handled": handled,
            },
        ))

    async def send_response(
        self,
        chat_id: int,
        text: str,
        media_url: Optional[str] = None,
        media_urls: Optional[List[str]] = None,
        media_type: Optional[MessageType] = None,
        buttons: Optional[Dict[str, Any]] = None,
    ) -> Optional[Message]:
        """Универсальная отправка ответа (текст/медиа/альбом + кнопки)"""
        reply_markup = build_keyboard(buttons)

        all_urls = [u for u in (media_urls or []) if u]
        if not all_urls and media_url:
            all_urls = [media_url]

        if len(all_urls) > 1:
            media_group = []
            for i, url in enumerate(all_urls[:10]):
                caption = text if i == 0 else None
                if is_video_url(url):
                    media_group.append(InputMediaVideo(media=url, caption=caption))
                elif is_document_url(url):
                    media_group.append(InputMediaDocument(media=url, caption=caption))
                else:
                    media_group.append(InputMediaPhoto(media=url, caption=caption))
            await self.telegram_bot.send_media_group(chat_id=chat_id, media=media_group)
            return None

        if all_urls and media_type:
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
                    **{media_param: all_urls[0]},
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

        buttons = command.response_buttons
        if buttons and isinstance(buttons, dict) and "buttons" in buttons:
            prepared_rows = []
            for r_idx, row in enumerate(buttons.get("buttons", [])):
                if not isinstance(row, list):
                    continue
                out_row = []
                for b_idx, btn in enumerate(row):
                    if not isinstance(btn, dict):
                        continue
                    btn_id = btn.get("id") or f"{r_idx}-{b_idx}"
                    btn_type = btn.get("type")
                    url = btn.get("url")
                    callback_action = btn.get("callback_action")
                    has_hidden = bool(btn.get("hidden_text_subscribed") or btn.get("hidden_text_unsubscribed"))
                    if btn_type == "url" and url:
                        out_row.append({"text": btn.get("text", ""), "url": url})
                    elif callback_action or has_hidden:
                        prefix = "cmd_hidden" if has_hidden else "cmd_callback"
                        out_row.append({
                            "text": btn.get("text", ""),
                            "callback_data": f"{prefix}:{command.id}:{btn_id}",
                        })
                if out_row:
                    prepared_rows.append(out_row)
            buttons = {"buttons": prepared_rows} if prepared_rows else None

        sent_message = await self.send_response(
            chat_id=message.chat.id,
            text=text,
            media_url=command.response_media_url,
            media_urls=getattr(command, "response_media_urls", None),
            media_type=command.response_media_type,
            buttons=buttons,
        )

        await self.save_outgoing_if_dm(
            chat_id=message.chat.id,
            tg_message=sent_message,
            fallback_type=command.response_media_type or MessageType.TEXT,
            fallback_media_url=command.response_media_url,
        )

    async def send_claim_admin(
        self,
        message: Message,
        command,
        text_content: str,
    ) -> None:
        """Отправить жалобу администратору (config-driven)."""
        reporter = message.from_user
        reporter_username = reporter.username if reporter and reporter.username else str(reporter.id if reporter else 'unknown')
        chat_title = message.chat.title if message.chat and getattr(message.chat, 'title', None) else str(message.chat.id if message.chat else '')

        claim_text = (
            f"Жалоба по команде {command.command}\n"
            f"От: @{reporter_username}\n"
            f"Чат: {chat_title}\n"
            f"Сообщение: {text_content[:3500]}"
        )

        claim_target = getattr(command, 'claim_target', None) or 'SPECIFIC_CHANNEL'
        claim_channel_ids = getattr(command, 'claim_channel_ids', None) or []

        try:
            if claim_target == 'SPECIFIC_CHANNEL':
                target_chat_ids: list[int] = []
                for rid in claim_channel_ids:
                    channel = await get_channel(self.db, rid)
                    if not channel or not channel.telegram_id:
                        continue
                    target_chat_ids.append(int(channel.telegram_id))

                if target_chat_ids:
                    # Celery handles rate limit retries without blocking webhook.
                    send_claim_messages.apply_async(args=[self.bot_model.id, target_chat_ids, claim_text], queue="default")
            elif claim_target == 'ADMINS':
                if reporter and reporter.id:
                    send_claim_to_admins.apply_async(
                        args=[self.bot_model.id, int(message.chat.id), int(reporter.id), int(message.message_id), claim_text],
                        queue="default",
                    )
            else:
                event_service = InboxEventService(self.db)
                channel_obj = await self.resolve_channel(message.chat.id)
                channel_id = channel_obj.id if channel_obj else None
                await event_service.create_event(InboxEventCreate(
                    owner_id=self.bot_model.owner_id,
                    category=InboxCategory.AUTOMATION,
                    entity_type=EntityType.BOT,
                    event_type=EventType.BOT_COMMAND,
                    bot_id=self.bot_model.id,
                    channel_id=channel_id,
                    tg_user_id=message.from_user.id if message.from_user else None,
                    tg_username=message.from_user.username if message.from_user else None,
                    status=EventStatus.NEW,
                    description=f"Жалоба по команде {command.command}",
                    payload={
                        "chat_id": message.chat.id,
                        "message_id": message.message_id,
                        "claim_target": claim_target,
                        "claim_channel_ids": claim_channel_ids,
                        "command": command.command,
                        "full_text": text_content,
                    },
                ))

            sent_message = await self.telegram_bot.send_message(
                chat_id=message.chat.id,
                text="Жалоба отправлена администраторам.",
            )
            await self.save_outgoing_if_dm(
                chat_id=message.chat.id,
                tg_message=sent_message,
                fallback_type=MessageType.TEXT,
                fallback_media_url=None,
            )
        except Exception as e:
            logger.error(f"Failed to send claim: {e}", exc_info=True)

    async def process_command(
        self,
        message: Message,
        text_content: str,
        chat_type: Optional[str],
    ) -> None:
        """Обработка команды"""
        raw_command_text = text_content.split()[0]
        command_text = self.normalize_command(raw_command_text)
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

            sent_message = await self.telegram_bot.send_message(
                chat_id=message.chat.id,
                text=response_text,
                parse_mode="HTML",
                reply_markup=keyboard,
                reply_to_message_id=message.message_id
            )

            await self.save_outgoing_if_dm(
                chat_id=message.chat.id,
                tg_message=sent_message,
                fallback_type=MessageType.TEXT,
                fallback_media_url=None,
            )

            return

        if command_text.lower() in MODERATION_COMMANDS:
            channel_obj = await self.resolve_channel(message.chat.id)
            if channel_obj:
                if not channel_obj.commands_enabled:
                    return
                cmd_name = command_text.lstrip("/").lower()
                allowed = channel_obj.enabled_commands
                if allowed is not None and cmd_name not in allowed:
                    return

            moderation_trigger_service = ModerationTriggerService()
            handled = await moderation_trigger_service.handle_command(
                command=command_text,
                message=message,
                telegram_bot=self.telegram_bot,
            )

            try:
                event_service = InboxEventService(self.db)
                channel_obj = await self.resolve_channel(message.chat.id)
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

                    await event_service.create_event(InboxEventCreate(
                        owner_id=self.bot_model.owner_id,
                        category=InboxCategory.SYSTEM,
                        entity_type=EntityType.CHANNEL,
                        event_type=EventType.CHANNEL_BAN,
                        bot_id=self.bot_model.id,
                        channel_id=channel_id,
                        tg_user_id=target_user_id,
                        tg_username=target_name,
                        status=EventStatus.NEW,
                        description=(
                            f"{'Разбан' if is_unbanned else 'Бан'} "
                            f"{'(mute)' if ban_type == 'mute' else ''} "
                            f"{target_name or target_user_id} "
                            f"командой {command_text}"
                        ).strip(),
                        payload={
                            "ban_type": ban_type,
                            "is_unbanned": is_unbanned,
                            "duration_minutes": duration_minutes,
                            "block_reason": f"Команда {command_text}",
                            "reason": f"Команда {command_text}",
                            "reason_source": "manual_command",
                            "command": command_text,
                            "chat_id": message.chat.id,
                            "message_id": message.message_id,
                            "issuer_user_id": message.from_user.id if message.from_user else None,
                            "issuer_username": message.from_user.username if message.from_user else None,
                        },
                    ))
                else:
                    await self.create_command_inbox_event(
                        message=message,
                        command_text=command_text,
                        text_content=text_content,
                        handled=handled,
                    )
            except Exception as e:
                logger.error(f"Failed to create inbox event for command {command_text}: {e}", exc_info=True)

            return

        command_service = BotCommandService(self.db)
        channel_obj = await self.resolve_channel(message.chat.id)
        channel_db_id = channel_obj.id if channel_obj else None
        command = await command_service.find_by_text(
            self.bot_model.id,
            command_text,
            chat_type=chat_type,
            channel_id=channel_db_id,
        )

        if command:
            trigger_summary = await self.trigger_service.fire_event_with_summary(
                bot_id=self.bot_model.id,
                trigger_type=TriggerType.COMMAND_CALLED,
                user_id=user_id,
                chat_id=message.chat.id,
                telegram_bot=self.telegram_bot,
                chat_type=message.chat.type if message.chat else None,
                context={
                    "command": command_text,
                    "message_id": message.message_id,
                    "message_text": text_content[:500] if text_content else None,
                    "username": message.from_user.username if message.from_user else None,
                }
            )
            triggered_count = trigger_summary.executed_count

            if triggered_count > 0:
                trigger_reason = trigger_summary.build_reason()
                try:
                    event_service = InboxEventService(self.db)
                    channel_obj = await self.resolve_channel(message.chat.id)
                    channel_id = channel_obj.id if channel_obj else None

                    await event_service.create_event(InboxEventCreate(
                        owner_id=self.bot_model.owner_id,
                        category=InboxCategory.AUTOMATION,
                        entity_type=EntityType.BOT,
                        event_type=EventType.SYSTEM_TRIGGER,
                        bot_id=self.bot_model.id,
                        channel_id=channel_id,
                        tg_user_id=message.from_user.id if message.from_user else None,
                        tg_username=message.from_user.username if message.from_user else None,
                        status=EventStatus.NEW,
                        description=trigger_reason or f"Сработал триггер ({triggered_count}) для команды {command_text} в чате {message.chat.id}",
                        payload={
                            "chat_id": message.chat.id,
                            "message_id": message.message_id,
                            "command": command_text,
                            "triggered_count": triggered_count,
                            "trigger_ids": trigger_summary.trigger_ids,
                            "trigger_names": trigger_summary.trigger_names,
                            "reason": trigger_reason,
                            "reason_source": "trigger",
                        },
                    ))
                except Exception as e:
                    logger.error(f"Failed to create inbox event for trigger execution on command: {e}", exc_info=True)

            try:
                await self.create_command_inbox_event(
                    message=message,
                    command_text=command_text,
                    text_content=text_content,
                    handled=True,
                )
            except Exception as e:
                logger.error(f"Failed to create inbox event for custom command {command_text}: {e}", exc_info=True)

            action_type = getattr(command, 'action_type', 'MESSAGE') or 'MESSAGE'
            if action_type == 'CLAIM_ADMIN':
                await self.send_claim_admin(message, command, text_content=text_content)
            else:
                await self.send_command_response(message, command)

            if message.chat.type == "private":
                try:
                    await self.save_system_message(
                        chat_id=message.chat.id,
                        text=f'Сработала команда "{command_text}"',
                    )
                except Exception as e:
                    logger.error(f"Failed to save system message for command: {e}", exc_info=True)

            return
