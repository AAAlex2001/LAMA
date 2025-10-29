"""
Сервис управления Telegram-ботами: CRUD по токену, отправка сообщений,
обработка вебхуков (join requests, сообщения), приветственный бот и правила допуска.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict, Optional, List, Any

from telegram import Bot, Update
from telegram.constants import ParseMode
from telegram.error import TelegramError
from telegram import InputMediaPhoto, InputMediaVideo, InputMediaDocument

from backend.models.bot import (
    BotCreate,
    BotUpdate,
    BotResponse,
    DMTemplate,
    WelcomeConfig,
    SendMessageRequest,
    MessageTargetType,
)
from backend.services.websocket_service import WebSocketManager


class BotRecord:
    """Внутренняя запись о боте с живым клиентом."""

    def __init__(self, bot_id: str, bot: Bot, username: str, name: Optional[str] = None):
        self.id = bot_id
        self.bot = bot
        self.username = username
        self.name = name
        self.created_at = datetime.utcnow()
        self.welcome_config: WelcomeConfig = WelcomeConfig()
        self.description_suffix: Optional[str] = None
        self.auto_approve_mode: str = "manual"
        self.clicks_by_callback: Dict[str, int] = {}
        self.total_users: int = 0
        self.blocked_users: int = 0
        self.commands: Dict[str, DMTemplate] = {}


class BotService:
    """Сервис управления несколькими Telegram-ботами."""

    def __init__(self, ws_manager: Optional[WebSocketManager] = None):
        self._bots: Dict[str, BotRecord] = {}
        self.ws_manager = ws_manager

    async def create(self, data: BotCreate) -> BotResponse:
        """Добавить бота по токену. Проверяем токен через get_me."""
        bot = Bot(token=data.token)
        me = await bot.get_me()
        bot_id = str(me.id)
        if bot_id in self._bots:
            record = self._bots[bot_id]
            # обновим имя, если указано
            if data.name:
                record.name = data.name
            return self._to_response(record)

        record = BotRecord(bot_id=bot_id, bot=bot, username=me.username or f"bot_{bot_id}", name=data.name)
        self._bots[bot_id] = record
        return self._to_response(record)

    def list(self) -> List[BotResponse]:
        return [self._to_response(r) for r in self._bots.values()]

    def get(self, bot_id: str) -> BotResponse:
        record = self.require(bot_id)
        return self._to_response(record)

    def update(self, bot_id: str, data: BotUpdate) -> BotResponse:
        record = self.require(bot_id)
        if data.name is not None:
            record.name = data.name
        if data.welcome_enabled is not None:
            record.welcome_config.enabled = data.welcome_enabled
        if data.auto_approve_mode is not None:
            record.welcome_config.mode = data.auto_approve_mode  # sync both
            record.auto_approve_mode = data.auto_approve_mode
        if data.description_suffix is not None:
            record.description_suffix = data.description_suffix
        return self._to_response(record)

    def delete(self, bot_id: str) -> bool:
        return self._bots.pop(bot_id, None) is not None

    async def send_dm(self, bot_id: str, user_id: int, message: DMTemplate) -> Dict[str, Any]:
        record = self.require(bot_id)
        text = await self.render_shortcodes(record, message.text or "", user_id=user_id)
        reply_markup = None
        if message.inline_buttons:
            from telegram import InlineKeyboardMarkup, InlineKeyboardButton

            rows = []
            for row in message.inline_buttons:
                btn_row = []
                for b in row:
                    if b.url:
                        btn_row.append(InlineKeyboardButton(text=b.text, url=str(b.url)))
                    else:
                        btn_row.append(InlineKeyboardButton(text=b.text, callback_data=b.callback_data))
                rows.append(btn_row)
            reply_markup = InlineKeyboardMarkup(rows)

        try:
            # Poll has priority
            if message.poll:
                poll = message.poll
                sent = await record.bot.send_poll(
                    chat_id=user_id,
                    question=poll.question,
                    options=poll.options,
                    is_anonymous=poll.is_anonymous,
                    type=("quiz" if poll.quiz else "regular"),
                    correct_option_id=poll.correct_option_id,
                )
            # Media group
            elif message.media and len(message.media) > 1:
                media_group = []
                for idx, m in enumerate(message.media):
                    caption = text if idx == 0 and text else None
                    if m.type == "photo":
                        media_group.append(InputMediaPhoto(media=str(m.url), caption=caption, parse_mode=ParseMode.HTML))
                    elif m.type == "video":
                        media_group.append(InputMediaVideo(media=str(m.url), caption=caption, parse_mode=ParseMode.HTML))
                    else:
                        media_group.append(InputMediaDocument(media=str(m.url), caption=caption, parse_mode=ParseMode.HTML))
                res = await record.bot.send_media_group(chat_id=user_id, media=media_group)
                sent = res[0]
            # Single media
            elif message.media and len(message.media) == 1:
                m = message.media[0]
                cap = text or m.caption
                if m.type == "photo":
                    sent = await record.bot.send_photo(chat_id=user_id, photo=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif m.type == "video":
                    sent = await record.bot.send_video(chat_id=user_id, video=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                else:
                    sent = await record.bot.send_document(chat_id=user_id, document=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
            # Legacy single media_urls
            elif message.media_urls:
                media_url = str(message.media_urls[0])
                if any(media_url.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    sent = await record.bot.send_photo(chat_id=user_id, photo=media_url, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif any(media_url.lower().endswith(ext) for ext in [".mp4", ".mov", ".mkv"]):
                    sent = await record.bot.send_video(chat_id=user_id, video=media_url, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                else:
                    sent = await record.bot.send_document(chat_id=user_id, document=media_url, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
            # Plain text
            else:
                sent = await record.bot.send_message(
                    chat_id=user_id,
                    text=text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=reply_markup,
                    disable_web_page_preview=True,
                )
            result = {"success": True, "message_id": sent.message_id}
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "dm_sent", "user_id": user_id, "message_id": sent.message_id})
            return result
        except TelegramError as e:
            code = getattr(e, "status_code", None)
            msg = str(e)
            if code == 403 or "Forbidden: bot was blocked" in msg or "bot was blocked" in msg:
                record.blocked_users += 1
                if self.ws_manager:
                    await self.ws_manager.broadcast(bot_id, {"event": "user_blocked", "user_id": user_id})
            return {"success": False, "error": msg, "code": code}

    async def send_message(self, req: SendMessageRequest) -> Dict[str, Any]:
        if req.target_type == MessageTargetType.USER:
            return await self.send_dm(req.bot_id, int(req.target_id), req.message)
        record = self.require(req.bot_id)
        # для чатов/каналов подставляем хотя бы дату
        text = await self.render_shortcodes(record, req.message.text or "", user_id=None)
        reply_markup = None
        if req.message.inline_buttons:
            from telegram import InlineKeyboardMarkup, InlineKeyboardButton

            rows = []
            for row in req.message.inline_buttons:
                btn_row = []
                for b in row:
                    if b.url:
                        btn_row.append(InlineKeyboardButton(text=b.text, url=str(b.url)))
                    else:
                        btn_row.append(InlineKeyboardButton(text=b.text, callback_data=b.callback_data))
                rows.append(btn_row)
            reply_markup = InlineKeyboardMarkup(rows)

        try:
            if req.message.poll:
                poll = req.message.poll
                sent = await record.bot.send_poll(
                    chat_id=req.target_id,
                    question=poll.question,
                    options=poll.options,
                    is_anonymous=poll.is_anonymous,
                    type=("quiz" if poll.quiz else "regular"),
                    correct_option_id=poll.correct_option_id,
                )
            elif req.message.media and len(req.message.media) > 1:
                media_group = []
                for idx, m in enumerate(req.message.media):
                    caption = text if idx == 0 and text else None
                    if m.type == "photo":
                        media_group.append(InputMediaPhoto(media=str(m.url), caption=caption, parse_mode=ParseMode.HTML))
                    elif m.type == "video":
                        media_group.append(InputMediaVideo(media=str(m.url), caption=caption, parse_mode=ParseMode.HTML))
                    else:
                        media_group.append(InputMediaDocument(media=str(m.url), caption=caption, parse_mode=ParseMode.HTML))
                res = await record.bot.send_media_group(chat_id=req.target_id, media=media_group)
                sent = res[0]
            elif req.message.media and len(req.message.media) == 1:
                m = req.message.media[0]
                cap = text or m.caption
                if m.type == "photo":
                    sent = await record.bot.send_photo(chat_id=req.target_id, photo=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif m.type == "video":
                    sent = await record.bot.send_video(chat_id=req.target_id, video=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                else:
                    sent = await record.bot.send_document(chat_id=req.target_id, document=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
            elif req.message.media_urls:
                photo = str(req.message.media_urls[0])
                sent = await record.bot.send_photo(chat_id=req.target_id, photo=photo, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
            else:
                sent = await record.bot.send_message(chat_id=req.target_id, text=text, parse_mode=ParseMode.HTML, reply_markup=reply_markup, disable_web_page_preview=True)
            result = {"success": True, "message_id": sent.message_id}
            if self.ws_manager:
                await self.ws_manager.broadcast(req.bot_id, {"event": "message_sent", "target_id": req.target_id, "message_id": sent.message_id})
            return result
        except TelegramError as e:
            code = getattr(e, "status_code", None)
            msg = str(e)
            if code == 403 or "Forbidden: bot was blocked" in msg or "bot was blocked" in msg:
                record.blocked_users += 1
                if self.ws_manager:
                    await self.ws_manager.broadcast(req.bot_id, {"event": "user_blocked", "target_id": req.target_id})
            return {"success": False, "error": msg, "code": code}

    async def render_shortcodes(self, record: "BotRecord", text: str, user_id: Optional[int], timezone: Optional[str] = None) -> str:
        if not text:
            return text
        result = text
        # {date}, {datetime}
        try:
            from dateutil import tz
            tzinfo = tz.gettz(timezone or "UTC")
            now = datetime.now(tzinfo)
            result = result.replace("{date}", now.strftime("%Y-%m-%d"))
            result = result.replace("{datetime}", now.strftime("%Y-%m-%d %H:%M"))
        except Exception:
            pass
        if user_id is None:
            return result
        try:
            chat = await record.bot.get_chat(user_id)
            username = getattr(chat, "username", None) or ""
            first_name = getattr(chat, "first_name", None) or ""
            last_name = getattr(chat, "last_name", None) or ""
            full_name = (first_name + (" " + last_name if last_name else "")).strip()
            result = result.replace("{username}", username)
            result = result.replace("{firstname}", first_name)
            result = result.replace("{lastname}", last_name)
            result = result.replace("{fullname}", full_name)
        except Exception:
            # если не удалось получить, просто вернем с подставленной датой
            pass
        return result

    async def enforce_description_suffix(self, bot_id: str) -> Dict[str, Any]:
        """Проверяет и дописывает статический текст в описании бота, если нужно."""
        record = self.require(bot_id)
        if not record.description_suffix:
            return {"success": True, "skipped": True}
        try:
            me = await record.bot.get_me()
            current_desc = (await record.bot.get_my_short_description()).short_description or ""
            suffix = record.description_suffix.strip()
            if suffix and suffix not in current_desc:
                new_desc = (current_desc + ("\n" if current_desc else "") + suffix)[:120]
                await record.bot.set_my_short_description(short_description=new_desc)
            return {"success": True}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def handle_webhook_update(self, bot_id: str, update_data: dict) -> Dict[str, Any]:
        """Обработка Telegram Update из вебхука: заявки, сообщения, callback-кнопки."""
        record = self.require(bot_id)
        try:
            update = Update.de_json(update_data, record.bot)
            # Join request trigger
            if update.chat_join_request and record.welcome_config.enabled:
                await self.process_join_request(record, update)
            # Direct message to bot
            if update.message and update.message.text:
                text = update.message.text.strip()
                if text in record.commands:
                    await self.send_dm(record.id, update.message.from_user.id, record.commands[text])
                record.total_users += 1
                if self.ws_manager:
                    await self.ws_manager.broadcast(record.id, {"event": "user_message", "user_id": update.message.from_user.id})
            # Callback query clicks
            if update.callback_query:
                data = update.callback_query.data or ""
                record.clicks_by_callback[data] = record.clicks_by_callback.get(data, 0) + 1
                # подтверждение колбэка без всплывашки
                try:
                    await update.callback_query.answer()
                except Exception:
                    pass
                if self.ws_manager:
                    await self.ws_manager.broadcast(record.id, {"event": "callback_click", "data": data, "count": record.clicks_by_callback[data]})
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def process_join_request(self, record: BotRecord, update: Update) -> None:
        req = update.chat_join_request
        user_id = req.from_user.id
        chat_id = req.chat.id

        mode = record.welcome_config.mode
        # Отправим приветственное DM
        if record.welcome_config.greet_message:
            await self.send_dm(record.id, user_id, record.welcome_config.greet_message)

        # Режимы одобрения
        if mode == "auto":
            await record.bot.approve_chat_join_request(chat_id=chat_id, user_id=user_id)
        elif mode == "rules":
            # Пример: отправим rules_message, решение оставим админам
            if record.welcome_config.rules_message:
                await self.send_dm(record.id, user_id, record.welcome_config.rules_message)
        else:
            # manual — ничего не делаем, админы решат
            return
        if self.ws_manager:
            await self.ws_manager.broadcast(record.id, {"event": "join_request", "user_id": user_id, "chat_id": chat_id, "mode": mode})

    def require(self, bot_id: str) -> BotRecord:
        record = self._bots.get(bot_id)
        if not record:
            raise ValueError("Bot not found")
        return record

    def _to_response(self, record: BotRecord) -> BotResponse:
        return BotResponse(
            id=record.id,
            username=record.username,
            name=record.name,
            created_at=record.created_at,
            welcome_enabled=record.welcome_config.enabled,
            auto_approve_mode=record.welcome_config.mode,
            description_suffix=record.description_suffix,
        )

    async def set_webhook(self, bot_id: str, url: str, secret_token: Optional[str] = None) -> Dict[str, Any]:
        record = self.require(bot_id)
        try:
            ok = await record.bot.set_webhook(url=url, secret_token=secret_token)
            return {"success": bool(ok)}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def render_preview(self, bot_id: str, message: DMTemplate, user_id: Optional[int], timezone: Optional[str]) -> Dict[str, Any]:
        record = self.require(bot_id)
        text = await self._render_shortcodes(record, message.text or "", user_id=user_id, timezone=timezone)
        return {"rendered_text": text}

    def get_stats(self, bot_id: str) -> Dict[str, Any]:
        record = self._require(bot_id)
        return {
            "bot_id": record.id,
            "clicks_by_callback": dict(record.clicks_by_callback),
            "total_users": record.total_users,
            "blocked_users": record.blocked_users,
        }

    # ==== Команды в личке ====

    def list_commands(self, bot_id: str) -> Dict[str, DMTemplate]:
        record = self._require(bot_id)
        return dict(record.commands)

    def set_command(self, bot_id: str, command: str, response: DMTemplate) -> Dict[str, DMTemplate]:
        record = self._require(bot_id)
        record.commands[command] = response
        return dict(record.commands)

    def delete_command(self, bot_id: str, command: str) -> Dict[str, DMTemplate]:
        record = self._require(bot_id)
        record.commands.pop(command, None)
        return dict(record.commands)


__all__ = ["BotService"]


