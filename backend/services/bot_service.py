"""
Сервис управления Telegram-ботами: CRUD по токену, отправка сообщений,
обработка вебхуков (join requests, сообщения), приветственный бот и правила допуска.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
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
    CaptchaState,
)
from backend.services.websocket_service import WebSocketManager
from sqlalchemy import select, update as sa_update, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from backend.models.db_models import (
    Bot as BotORM,
    BotCommand as BotCommandORM,
    BotTemplate as BotTemplateORM,
    BotTriggerConfig as BotTriggerConfigORM,
    BotApplicant as BotApplicantORM,
    BotCaptchaState as BotCaptchaStateORM,
    BotInboxMessage as BotInboxMessageORM,
    BotCallbackClick as BotCallbackClickORM,
)


class BotRecord:
    """Внутренняя запись о боте с живым клиентом."""

    def __init__(self, bot_id: str, bot: Bot, username: str, name: Optional[str] = None):
        self.id = bot_id
        self.bot = bot
        self.username = username
        self.name = name
        self.description: Optional[str] = None
        self.photo_url: Optional[str] = None
        self.created_at = datetime.utcnow()
        self.welcome_config: WelcomeConfig = WelcomeConfig()
        self.description_suffix: Optional[str] = None
        self.auto_approve_mode: str = "manual"
        self.clicks_by_callback: Dict[str, int] = {}
        self.total_users: int = 0
        self.blocked_users: int = 0
        self.commands: Dict[str, DMTemplate] = {}
        self.applicants: Dict[int, Dict[str, Any]] = {}
        self.captcha_states: Dict[int, CaptchaState] = {}
        self.inbox: Dict[int, List[Dict[str, Any]]] = {}
        self.branch_map: Dict[str, Dict[str, Any]] = {}
        self.deliveries_ok: int = 0
        self.deliveries_fail: int = 0
        self.working_chats: Optional[set[int | str]] = None
        self.templates: Dict[str, DMTemplate] = {}
        self.trigger_configs: Dict[str, Any] = {}
        self.user_series_progress: Dict[int, Dict[str, int]] = {}
        self.series_data: Dict[str, Dict[str, Any]] = {}


class BotService:
    """Сервис управления несколькими Telegram-ботами c хранением в Postgres."""

    def __init__(self, ws_manager: Optional[WebSocketManager] = None, scheduler: Optional[Any] = None, session_factory: Optional[async_sessionmaker[AsyncSession]] = None):
        self._bots: Dict[str, BotRecord] = {}
        self.ws_manager = ws_manager
        self.scheduler = scheduler
        self.session_factory = session_factory

    async def create(self, data: BotCreate) -> BotResponse:
        bot = Bot(token=data.token)
        me = await bot.get_me()
        bot_id = str(me.id)
        async with self.session_factory() as session:
            existing = await session.get(BotORM, bot_id)
            if existing:
                if data.name is not None:
                    existing.name = data.name
                    await session.commit()
                record = BotRecord(bot_id=bot_id, bot=bot, username=existing.username, name=existing.name)
                self._bots[bot_id] = record
                return self.to_response(existing)
            orm = BotORM(
                id=bot_id,
                token=data.token,
                username=me.username or f"bot_{bot_id}",
                name=data.name,
            )
            session.add(orm)
            await session.commit()
            await session.refresh(orm)
            record = BotRecord(bot_id=bot_id, bot=bot, username=orm.username, name=orm.name)
            self._bots[bot_id] = record
            return self.to_response(orm)

    async def list(self) -> List[BotResponse]:
        async with self.session_factory() as session:
            res = await session.execute(select(BotORM))
            rows = res.scalars().all()
            return [self.to_response(o) for o in rows]

    async def get(self, bot_id: str) -> BotResponse:
        async with self.session_factory() as session:
            obj = await session.get(BotORM, bot_id)
            if not obj:
                raise ValueError("Bot not found")
            return self.to_response(obj)

    async def update(self, bot_id: str, data: BotUpdate) -> BotResponse:
        record = await self.require(bot_id)
        if data.name is not None:
            record.name = data.name
            try:
                await record.bot.set_my_name(name=data.name)
            except Exception as e:
                print(f"Failed to update bot name: {e}")
        if data.description is not None:
            record.description = data.description
            try:
                await record.bot.set_my_short_description(short_description=data.description)
            except Exception as e:
                print(f"Failed to update bot description: {e}")
        async with self.session_factory() as session:
            orm = await session.get(BotORM, bot_id)
            if not orm:
                raise ValueError("Bot not found")
            if data.name is not None:
                orm.name = data.name
            if data.description is not None:
                orm.description = data.description
            if data.photo_url is not None:
                orm.photo_url = str(data.photo_url)
            if data.welcome_enabled is not None:
                orm.welcome_enabled = data.welcome_enabled
            if data.welcome_config is not None:
                wc = data.welcome_config
                orm.welcome_mode = wc.mode
                orm.welcome_greet_message = wc.greet_message.model_dump() if wc.greet_message else None
                orm.welcome_rules_message = wc.rules_message.model_dump() if wc.rules_message else None
                orm.welcome_allow_rules = wc.allow_rules.model_dump() if wc.allow_rules else None
            if data.auto_approve_mode is not None:
                orm.welcome_mode = data.auto_approve_mode
            if data.description_suffix is not None:
                orm.description_suffix = data.description_suffix
            await session.commit()
            await session.refresh(orm)
            return self.to_response(orm)

    async def delete(self, bot_id: str) -> bool:
        async with self.session_factory() as session:
            res = await session.execute(sa_delete(BotORM).where(BotORM.id == bot_id))
            await session.commit()
        self._bots.pop(bot_id, None)
        return bool(res.rowcount)

    async def send_dm(self, bot_id: str, user_id: int, message: DMTemplate) -> Dict[str, Any]:
        record = await self.require(bot_id)
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
            elif message.media and len(message.media) == 1:
                m = message.media[0]
                cap = text or m.caption
                if m.type == "photo":
                    sent = await record.bot.send_photo(chat_id=user_id, photo=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif m.type == "video":
                    sent = await record.bot.send_video(chat_id=user_id, video=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                else:
                    sent = await record.bot.send_document(chat_id=user_id, document=str(m.url), caption=cap, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
            elif message.media_urls:
                media_url = str(message.media_urls[0])
                if any(media_url.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    sent = await record.bot.send_photo(chat_id=user_id, photo=media_url, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif any(media_url.lower().endswith(ext) for ext in [".mp4", ".mov", ".mkv"]):
                    sent = await record.bot.send_video(chat_id=user_id, video=media_url, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                else:
                    sent = await record.bot.send_document(chat_id=user_id, document=media_url, caption=text or None, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
            else:
                sent = await record.bot.send_message(
                    chat_id=user_id,
                    text=text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=reply_markup,
                    disable_web_page_preview=True,
                )
            async with self.session_factory() as session:
                orm = await session.get(BotORM, bot_id)
                if orm:
                    orm.deliveries_ok = (orm.deliveries_ok or 0) + 1
                    await session.commit()
            result = {"success": True, "message_id": sent.message_id}
            if message.auto_delete and isinstance(message.auto_delete.hours, int) and message.auto_delete.hours > 0:
                await self.schedule_dm_auto_delete(record, chat_id=user_id, message_id=sent.message_id, hours=message.auto_delete.hours)
            self.inbox_log(record, user_id, direction="out", text=message.text or "")
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "dm_sent", "user_id": user_id, "message_id": sent.message_id})
            return result
        except TelegramError as e:
            async with self.session_factory() as session:
                orm = await session.get(BotORM, bot_id)
                if orm:
                    orm.deliveries_fail = (orm.deliveries_fail or 0) + 1
                    await session.commit()
            code = getattr(e, "status_code", None)
            msg = str(e)
            if code == 403 or "Forbidden: bot was blocked" in msg or "bot was blocked" in msg:
                async with self.session_factory() as session:
                    orm = await session.get(BotORM, bot_id)
                    if orm:
                        orm.blocked_users = (orm.blocked_users or 0) + 1
                        await session.commit()
                if self.ws_manager:
                    await self.ws_manager.broadcast(bot_id, {"event": "user_blocked", "user_id": user_id})
            return {"success": False, "error": msg, "code": code}

    async def send_message(self, req: SendMessageRequest) -> Dict[str, Any]:
        if req.target_type == MessageTargetType.USER:
            return await self.send_dm(req.bot_id, int(req.target_id), req.message)
        record = await self.require(req.bot_id)
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
            async with self.session_factory() as session:
                orm = await session.get(BotORM, req.bot_id)
                if orm:
                    orm.deliveries_ok = (orm.deliveries_ok or 0) + 1
                    await session.commit()
            result = {"success": True, "message_id": sent.message_id}
            if req.message.auto_delete and isinstance(req.message.auto_delete.hours, int) and req.message.auto_delete.hours > 0:
                await self.schedule_dm_auto_delete(record, chat_id=req.target_id, message_id=sent.message_id, hours=req.message.auto_delete.hours)
            if self.ws_manager:
                await self.ws_manager.broadcast(req.bot_id, {"event": "message_sent", "target_id": req.target_id, "message_id": sent.message_id})
            return result
        except TelegramError as e:
            async with self.session_factory() as session:
                orm = await session.get(BotORM, req.bot_id)
                if orm:
                    orm.deliveries_fail = (orm.deliveries_fail or 0) + 1
                    await session.commit()
            code = getattr(e, "status_code", None)
            msg = str(e)
            if code == 403 or "Forbidden: bot was blocked" in msg or "bot was blocked" in msg:
                async with self.session_factory() as session:
                    orm = await session.get(BotORM, req.bot_id)
                    if orm:
                        orm.blocked_users = (orm.blocked_users or 0) + 1
                        await session.commit()
                if self.ws_manager:
                    await self.ws_manager.broadcast(req.bot_id, {"event": "user_blocked", "target_id": req.target_id})
            return {"success": False, "error": msg, "code": code}

    async def render_shortcodes(self, record: "BotRecord", text: str, user_id: Optional[int], timezone: Optional[str] = None) -> str:
        if not text:
            return text
        result = text
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
            pass
        return result

    async def enforce_description_suffix(self, bot_id: str) -> Dict[str, Any]:
        record = await self.require(bot_id)
        if not record.description_suffix:
            return {"success": True, "skipped": True}
        try:
            await record.bot.get_me()
            current_desc = (await record.bot.get_my_short_description()).short_description or ""
            suffix = record.description_suffix.strip()
            if suffix and suffix not in current_desc:
                new_desc = (current_desc + ("\n" if current_desc else "") + suffix)[:120]
                await record.bot.set_my_short_description(short_description=new_desc)
            return {"success": True}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def handle_webhook_update(self, bot_id: str, update_data: dict) -> Dict[str, Any]:
        record = await self.require(bot_id)
        try:
            update = Update.de_json(update_data, record.bot)
            async with self.session_factory() as session:
                orm = await session.get(BotORM, bot_id)
                if not orm:
                    return {"success": True}

                join_req = update.chat_join_request
                if join_req is not None:
                    if not orm.welcome_enabled:
                        return {"success": True, "skipped": True}
                    if orm.working_chats and join_req.chat.id not in set(orm.working_chats):
                        return {"success": True, "skipped": True}
                    await self.process_join_request(record, update)
                    return {"success": True}

                chat_member = update.chat_member
                if chat_member is not None:
                    if orm.working_chats and chat_member.chat.id not in set(orm.working_chats):
                        return {"success": True, "skipped": True}
                    await self.handle_chat_member_update(record, update)
                    return {"success": True}

                msg = update.message
                if msg is not None and msg.text:
                    text = msg.text.strip()
                    user_id = msg.from_user.id
                    self.inbox_log(record, user_id, direction="in", text=text)
                    from sqlalchemy import and_
                    res = await session.execute(
                        select(BotCommandORM).where(and_(BotCommandORM.bot_id == record.id, BotCommandORM.command == text))
                    )
                    row = res.scalar_one_or_none()
                    if row:
                        from backend.models.bot import DMTemplate
                        await self.send_dm(record.id, user_id, DMTemplate(**row.response))
                        if self.ws_manager:
                            await self.ws_manager.broadcast(record.id, {"event": "user_command", "user_id": user_id, "command": text})
                        await self.trigger_event(record, "user_message", user_id)
                    else:
                        if self.ws_manager:
                            await self.ws_manager.broadcast(record.id, {"event": "user_message", "user_id": user_id})
                    orm.total_users = (orm.total_users or 0) + 1
                    await session.commit()
                    return {"success": True}

                cq = update.callback_query
                if cq is not None:
                    data = cq.data or ""
                    user_id = cq.from_user.id
                    res = await session.execute(
                        select(BotCallbackClickORM).where(BotCallbackClickORM.bot_id == record.id, BotCallbackClickORM.data == data)
                    )
                    row = res.scalar_one_or_none()
                    if not row:
                        session.add(BotCallbackClickORM(bot_id=record.id, data=data, count=1))
                    else:
                        row.count = (row.count or 0) + 1
                    await session.commit()
                    try:
                        await cq.answer()
                    except Exception:
                        pass
                    await self.handle_callback(record, user_id, data)
                    if self.ws_manager:
                        await self.ws_manager.broadcast(record.id, {"event": "callback_click", "data": data})
                    return {"success": True}

                return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def process_join_request(self, record: BotRecord, update: Update) -> None:
        req = update.chat_join_request
        user_id = req.from_user.id
        chat_id = req.chat.id

        async with self.session_factory() as session:
            session.add(BotApplicantORM(bot_id=record.id, user_id=user_id, chat_id=str(chat_id), status="pending"))
            orm = await session.get(BotORM, record.id)
            greet = orm.welcome_greet_message if orm else None
            mode = (orm.welcome_mode if orm else "manual")
            await session.commit()

        if greet:
            from backend.models.bot import DMTemplate
            await self.send_dm(record.id, user_id, DMTemplate(**greet))
        await self.trigger_event(record, "join_request_created", user_id)
        if mode == "auto":
            await self.approve_request(record, chat_id, user_id)
        elif mode == "rules":
            await self.process_rules(record, chat_id, user_id)
        else:
            if self.ws_manager:
                await self.ws_manager.broadcast(record.id, {"event": "join_request", "user_id": user_id, "chat_id": chat_id, "mode": mode})

    async def process_rules(self, record: BotRecord, chat_id: int | str, user_id: int) -> None:
        async with self.session_factory() as session:
            orm = await session.get(BotORM, record.id)
        require_memberships = []
        captcha_enabled = False
        if orm and orm.welcome_allow_rules:
            require_memberships = orm.welcome_allow_rules.get("require_memberships", [])
            captcha_enabled = bool(orm.welcome_allow_rules.get("captcha_enabled", False))
        memberships_ok = await self.check_memberships(record, user_id, require_memberships)
        if captcha_enabled:
            await self.send_captcha(record, user_id)
        if memberships_ok and not captcha_enabled:
            await self.approve_request(record, chat_id, user_id)
        else:
            if orm and orm.welcome_rules_message:
                from backend.models.bot import DMTemplate
                await self.send_dm(record.id, user_id, DMTemplate(**orm.welcome_rules_message))

    async def check_memberships(self, record: BotRecord, user_id: int, chats: List[str]) -> bool:
        if not chats:
            return True
        ok = True
        for chat in chats:
            try:
                member = await record.bot.get_chat_member(chat_id=chat, user_id=user_id)
                status = getattr(member, "status", None)
                if status not in ("member", "administrator", "creator"):
                    ok = False
            except TelegramError:
                ok = False
        return ok

    async def send_captcha(self, record: BotRecord, user_id: int) -> None:
        from telegram import InlineKeyboardMarkup, InlineKeyboardButton

        keyboard = InlineKeyboardMarkup([[InlineKeyboardButton(text="Подтвердить", callback_data=f"captcha:{user_id}:ok")]])
        msg = await record.bot.send_message(chat_id=user_id, text="Подтвердите, что вы не бот — нажмите кнопку.", reply_markup=keyboard)
        async with self.session_factory() as session:
            state = await session.get(BotCaptchaStateORM, {"bot_id": record.id, "user_id": user_id})
            if state:
                state.challenge_sent_message_id = msg.message_id
            else:
                session.add(BotCaptchaStateORM(bot_id=record.id, user_id=user_id, challenge_sent_message_id=msg.message_id))
            await session.commit()

    async def handle_callback(self, record: BotRecord, user_id: int, data: str) -> None:
        if data.startswith("captcha:"):
            parts = data.split(":")
            if len(parts) == 3 and parts[2] == "ok":
                async with self.session_factory() as session:
                    state = await session.get(BotCaptchaStateORM, {"bot_id": record.id, "user_id": user_id})
                    if state:
                        state.passed = True
                        await session.commit()
                    app = await session.get(BotApplicantORM, {"bot_id": record.id, "user_id": user_id})
                    if app and app.status == "pending":
                        await self.approve_request(record, app.chat_id, user_id)
                if self.ws_manager:
                    await self.ws_manager.broadcast(record.id, {"event": "captcha_passed", "user_id": user_id})
                await self.trigger_event(record, "captcha_passed", user_id)
            return
        
        for series_id, series in record.series_data.items():
            if data == series.get("branch_click_data"):
                user_progress = record.user_series_progress.get(user_id, {})
                current_step = user_progress.get(series_id, 0)
                series_steps = series.get("steps", [])
                
                if current_step < len(series_steps):
                    step = series_steps[current_step]
                    if step.get("branch_on_click_data") == data:
                        await self.send_dm(record.id, user_id, step["message"])
                        if series_id not in user_progress:
                            user_progress[series_id] = 0
                        user_progress[series_id] += 1
                        record.user_series_progress[user_id] = user_progress
                        return
        
        async with self.session_factory() as session:
            orm = await session.get(BotORM, record.id)
            bm = (orm.branch_map or {}) if orm else {}
        cfg = bm.get(data)
        if cfg:
            try:
                await self.send_message(SendMessageRequest(**cfg))
            except Exception:
                pass

    async def approve_request(self, record: BotRecord, chat_id: int | str, user_id: int) -> None:
        try:
            await record.bot.approve_chat_join_request(chat_id=chat_id, user_id=user_id)
            async with self.session_factory() as session:
                app = await session.get(BotApplicantORM, {"bot_id": record.id, "user_id": user_id})
                if app:
                    app.status = "approved"
                    app.approved_at = datetime.utcnow()
                    await session.commit()
            if self.ws_manager:
                await self.ws_manager.broadcast(record.id, {"event": "join_request_approved", "user_id": user_id, "chat_id": chat_id})
            await self.trigger_event(record, "join_request_approved", user_id)
        except TelegramError:
            pass

    async def decline_request(self, record: BotRecord, chat_id: int | str, user_id: int) -> None:
        try:
            await record.bot.decline_chat_join_request(chat_id=chat_id, user_id=user_id)
            async with self.session_factory() as session:
                app = await session.get(BotApplicantORM, {"bot_id": record.id, "user_id": user_id})
                if app:
                    app.status = "declined"
                    app.declined_at = datetime.utcnow()
                    await session.commit()
            if self.ws_manager:
                await self.ws_manager.broadcast(record.id, {"event": "join_request_declined", "user_id": user_id, "chat_id": chat_id})
            await self.trigger_event(record, "join_request_declined", user_id)
        except TelegramError:
            pass

    async def approve_request_by_id(self, bot_id: str, chat_id: int | str, user_id: int) -> Dict[str, Any]:
        record = await self.require(bot_id)
        await self.approve_request(record, chat_id, user_id)
        return {"success": True}

    async def decline_request_by_id(self, bot_id: str, chat_id: int | str, user_id: int) -> Dict[str, Any]:
        record = await self.require(bot_id)
        await self.decline_request(record, chat_id, user_id)
        return {"success": True}

    async def set_working_chats(self, bot_id: str, chat_ids: Optional[List[int | str]]) -> Dict[str, Any]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            orm = await session.get(BotORM, bot_id)
            if not orm:
                raise ValueError("Bot not found")
            orm.working_chats = list(chat_ids) if chat_ids else None
            await session.commit()
            return {"success": True, "count": len(orm.working_chats) if orm.working_chats else 0}

    async def save_template(self, bot_id: str, template_id: str, tpl: DMTemplate) -> Dict[str, Any]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            payload = tpl.model_dump() if hasattr(tpl, "model_dump") else tpl
            obj = await session.get(BotTemplateORM, {"bot_id": bot_id, "template_id": template_id})
            if obj:
                obj.message = payload
            else:
                session.add(BotTemplateORM(bot_id=bot_id, template_id=template_id, message=payload))
            await session.commit()
            return {"success": True}

    async def get_templates(self, bot_id: str) -> Dict[str, DMTemplate]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            res = await session.execute(select(BotTemplateORM).where(BotTemplateORM.bot_id == bot_id))
            return {row.template_id: row.message for row in res.scalars().all()}

    async def delete_template(self, bot_id: str, template_id: str) -> Dict[str, Any]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            await session.execute(sa_delete(BotTemplateORM).where(BotTemplateORM.bot_id == bot_id, BotTemplateORM.template_id == template_id))
            await session.commit()
            return {"success": True}

    async def handle_chat_member_update(self, record: BotRecord, update: Update) -> None:
        cm = update.chat_member
        if not cm:
            return
        user_id = cm.new_chat_member.user.id
        status = cm.new_chat_member.status
        evt = None
        if status in ("member", "administrator", "creator"):
            evt = "member_joined"
        elif status == "left":
            evt = "member_left"
        if evt and self.ws_manager:
            await self.ws_manager.broadcast(record.id, {"event": evt, "user_id": user_id, "chat_id": cm.chat.id})
        if evt:
            await self.trigger_event(record, evt, user_id)

    async def require(self, bot_id: str) -> BotRecord:
        record = self._bots.get(bot_id)
        if record:
            return record
        async with self.session_factory() as session:
            orm = await session.get(BotORM, bot_id)
            if not orm:
                raise ValueError("Bot not found")
            bot = Bot(token=orm.token)
            rec = BotRecord(bot_id=bot_id, bot=bot, username=orm.username, name=orm.name)
            self._bots[bot_id] = rec
            return rec

    def to_response(self, record: BotRecord | BotORM) -> BotResponse:
        if isinstance(record, BotRecord):
            # загрузим ORM для стабильных полей
            orm = None
        else:
            orm = record
        if orm is None:
            # fallback к полям клиента
            return BotResponse(
                id=record.id,
                username=record.username,
                name=record.name,
                description=getattr(record, "description", None),
                photo_url=getattr(record, "photo_url", None),
                created_at=getattr(record, "created_at", datetime.utcnow()),
                welcome_enabled=getattr(record, "welcome_config", WelcomeConfig()).enabled,
                auto_approve_mode=getattr(record, "welcome_config", WelcomeConfig()).mode,
                description_suffix=getattr(record, "description_suffix", None),
            )
        return BotResponse(
            id=orm.id,
            username=orm.username,
            name=orm.name,
            description=orm.description,
            photo_url=orm.photo_url,
            created_at=orm.created_at,
            welcome_enabled=bool(orm.welcome_enabled),
            auto_approve_mode=orm.welcome_mode,
            description_suffix=orm.description_suffix,
        )

    async def set_webhook(self, bot_id: str, url: str, secret_token: Optional[str] = None) -> Dict[str, Any]:
        record = await self.require(bot_id)
        try:
            ok = await record.bot.set_webhook(url=url, secret_token=secret_token)
            return {"success": bool(ok)}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def render_preview(self, bot_id: str, message: DMTemplate, user_id: Optional[int], timezone: Optional[str]) -> Dict[str, Any]:
        record = await self.require(bot_id)
        text = await self.render_shortcodes(record, message.text or "", user_id=user_id, timezone=timezone)
        return {"rendered_text": text}

    async def get_stats(self, bot_id: str) -> Dict[str, Any]:
        async with self.session_factory() as session:
            orm = await session.get(BotORM, bot_id)
            clicks: Dict[str, int] = {}
            res = await session.execute(select(BotCallbackClickORM).where(BotCallbackClickORM.bot_id == bot_id))
            for row in res.scalars().all():
                clicks[row.data] = row.count
            return {
                "bot_id": bot_id,
                "clicks_by_callback": clicks,
                "total_users": orm.total_users if orm else 0,
                "blocked_users": orm.blocked_users if orm else 0,
                "deliveries_ok": orm.deliveries_ok if orm else 0,
                "deliveries_fail": orm.deliveries_fail if orm else 0,
            }

    async def list_commands(self, bot_id: str) -> Dict[str, DMTemplate]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            res = await session.execute(select(BotCommandORM).where(BotCommandORM.bot_id == bot_id))
            return {row.command: row.response for row in res.scalars().all()}

    async def set_command(self, bot_id: str, command: str, response: DMTemplate) -> Dict[str, DMTemplate]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            payload = response.model_dump() if hasattr(response, "model_dump") else response
            obj = await session.get(BotCommandORM, {"bot_id": bot_id, "command": command})
            if obj:
                obj.response = payload
            else:
                session.add(BotCommandORM(bot_id=bot_id, command=command, response=payload))
            await session.commit()
            res = await session.execute(select(BotCommandORM).where(BotCommandORM.bot_id == bot_id))
            return {r.command: r.response for r in res.scalars().all()}

    async def delete_command(self, bot_id: str, command: str) -> Dict[str, DMTemplate]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            await session.execute(sa_delete(BotCommandORM).where(BotCommandORM.bot_id == bot_id, BotCommandORM.command == command))
            await session.commit()
            res = await session.execute(select(BotCommandORM).where(BotCommandORM.bot_id == bot_id))
            return {r.command: r.response for r in res.scalars().all()}

    async def schedule_dm_auto_delete(self, record: BotRecord, chat_id: int | str, message_id: int, hours: int) -> None:
        async def delete_message():
            try:
                await asyncio.sleep(hours * 3600)
                await record.bot.delete_message(chat_id=chat_id, message_id=message_id)
            except Exception:
                pass
        asyncio.create_task(delete_message())

    def inbox_log(self, record: BotRecord, user_id: int, direction: str, text: str) -> None:
        async def _write():
            async with self.session_factory() as session:
                session.add(BotInboxMessageORM(bot_id=record.id, user_id=user_id, direction=direction, text=text))
                await session.commit()
        asyncio.create_task(_write())

    async def ban_user(self, bot_id: str, chat_id: int | str, user_id: int, minutes: Optional[int], reason: Optional[str]) -> Dict[str, Any]:
        record = await self.require(bot_id)
        until_date = None
        if minutes and minutes > 0:
            until_date = datetime.utcnow() + timedelta(minutes=minutes)
        try:
            await record.bot.ban_chat_member(chat_id=chat_id, user_id=user_id, until_date=until_date)
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "ban", "chat_id": chat_id, "user_id": user_id, "minutes": minutes, "reason": reason})
            return {"success": True}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def kick_user(self, bot_id: str, chat_id: int | str, user_id: int, reason: Optional[str]) -> Dict[str, Any]:
        record = await self.require(bot_id)
        try:
            await record.bot.ban_chat_member(chat_id=chat_id, user_id=user_id)
            await record.bot.unban_chat_member(chat_id=chat_id, user_id=user_id)
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "kick", "chat_id": chat_id, "user_id": user_id, "reason": reason})
            return {"success": True}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def mute_user(self, bot_id: str, chat_id: int | str, user_id: int, minutes: Optional[int], reason: Optional[str]) -> Dict[str, Any]:
        record = await self.require(bot_id)
        until_date = None
        if minutes and minutes > 0:
            until_date = datetime.utcnow() + timedelta(minutes=minutes)
        try:
            permissions = {
                "can_send_messages": False,
                "can_send_audios": False,
                "can_send_documents": False,
                "can_send_photos": False,
                "can_send_videos": False,
                "can_send_video_notes": False,
                "can_send_voice_notes": False,
                "can_send_polls": False,
                "can_add_web_page_previews": False,
            }
            await record.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions, until_date=until_date)
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "mute", "chat_id": chat_id, "user_id": user_id, "minutes": minutes, "reason": reason})
            return {"success": True}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def unban_user(self, bot_id: str, chat_id: int | str, user_id: int, reason: Optional[str]) -> Dict[str, Any]:
        record = await self.require(bot_id)
        try:
            ok = await record.bot.unban_chat_member(chat_id=chat_id, user_id=user_id)
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "unban", "chat_id": chat_id, "user_id": user_id, "reason": reason})
            return {"success": bool(ok)}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def unmute_user(self, bot_id: str, chat_id: int | str, user_id: int, reason: Optional[str]) -> Dict[str, Any]:
        record = await self.require(bot_id)
        try:
            permissions = {
                "can_send_messages": True,
                "can_send_audios": True,
                "can_send_documents": True,
                "can_send_photos": True,
                "can_send_videos": True,
                "can_send_video_notes": True,
                "can_send_voice_notes": True,
                "can_send_polls": True,
                "can_add_web_page_previews": True,
            }
            ok = await record.bot.restrict_chat_member(chat_id=chat_id, user_id=user_id, permissions=permissions)
            if self.ws_manager:
                await self.ws_manager.broadcast(bot_id, {"event": "unmute", "chat_id": chat_id, "user_id": user_id, "reason": reason})
            return {"success": bool(ok)}
        except TelegramError as e:
            return {"success": False, "error": str(e)}

    async def trigger_event(self, record: BotRecord, trigger_type: str, user_id: int) -> None:
        """Обработка события триггера с возможностью отложенной отправки."""
        async with self.session_factory() as session:
            cfg_row = await session.get(BotTriggerConfigORM, {"bot_id": record.id, "trigger_type": trigger_type})
            cfg = cfg_row.config if cfg_row else None
        if not cfg:
            return
        
        delay = timedelta()
        if cfg.get("delay_minutes"):
            delay += timedelta(minutes=cfg["delay_minutes"])
        if cfg.get("delay_hours"):
            delay += timedelta(hours=cfg["delay_hours"])
        if cfg.get("delay_days"):
            delay += timedelta(days=cfg["delay_days"])
        
        if delay.total_seconds() > 0:
            if self.scheduler and cfg.get("message"):
                run_at = datetime.utcnow() + delay
                job_id = f"trigger_{record.id}_{trigger_type}_{user_id}_{int(run_at.timestamp())}"
                self.scheduler.schedule_bot_message_once(
                    job_id=job_id,
                    run_at=run_at,
                    bot_id=record.id,
                    target_type="user",
                    target_id=user_id,
                    message=cfg["message"].model_dump() if hasattr(cfg["message"], "model_dump") else cfg["message"]
                )
        else:
            if cfg.get("message"):
                await self.send_dm(record.id, user_id, cfg["message"])


    async def set_trigger_config(self, bot_id: str, trigger_type: str, config: Dict[str, Any]) -> dict:
        await self.require(bot_id)
        async with self.session_factory() as session:
            obj = await session.get(BotTriggerConfigORM, {"bot_id": bot_id, "trigger_type": trigger_type})
            if obj:
                obj.config = config
            else:
                session.add(BotTriggerConfigORM(bot_id=bot_id, trigger_type=trigger_type, config=config))
            await session.commit()
            return {"success": True, "trigger_type": trigger_type}

    async def get_trigger_configs(self, bot_id: str) -> Dict[str, Any]:
        await self.require(bot_id)
        async with self.session_factory() as session:
            res = await session.execute(select(BotTriggerConfigORM).where(BotTriggerConfigORM.bot_id == bot_id))
            return {row.trigger_type: row.config for row in res.scalars().all()}

    async def delete_trigger_config(self, bot_id: str, trigger_type: str) -> dict:
        await self.require(bot_id)
        async with self.session_factory() as session:
            await session.execute(sa_delete(BotTriggerConfigORM).where(BotTriggerConfigORM.bot_id == bot_id, BotTriggerConfigORM.trigger_type == trigger_type))
            await session.commit()
            return {"success": True}

    async def set_branch_mapping(self, bot_id: str, mapping: Dict[str, Any]) -> dict:
        await self.require(bot_id)
        async with self.session_factory() as session:
            orm = await session.get(BotORM, bot_id)
            if not orm:
                raise ValueError("Bot not found")
            current = orm.branch_map or {}
            current.update(mapping)
            orm.branch_map = current
            await session.commit()
            return {"success": True, "size": len(orm.branch_map or {})}


__all__ = ["BotService"]


