"""
TelegramService — публикации/редактирование/удаление постов в каналах.
Под нагрузкой: единый rate-limit и retry/backoff, минимальная вложенность.
Закрывает: автопин, quiz-опросы, редактирование уже опубликованных.
"""

from __future__ import annotations

import asyncio
import html
from typing import Any, Dict, List, Optional, Callable, Awaitable, Tuple
from uuid import UUID

from telegram import (
    Bot,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    InputMediaPhoto,
    InputMediaVideo,
    InputMediaDocument,
    InputMediaAudio,
)
from telegram.constants import ParseMode
from telegram.error import TelegramError, RetryAfter, TimedOut

from backend.services.bot_service import BotService
from backend.services.channel_service import ChannelService


class TelegramService:
    """
    Паблик-API:
      - publish_to_channel(channel_id: str, publication: dict, publication_id: str) -> dict
      - delete_message(channel_id: str, message_id: int) -> None
      - edit_publication(channel_id: str, message_id: int, new_data: dict) -> dict

    DI:
      - bot_service: обязателен (даёт Bot по bot_id)
      - channel_service: опционально (получить bot_id по channel_id)
      - notifier: опциональный async callback (publication_id, ok: bool, payload: dict) -> None
    """

    tg_sem = asyncio.Semaphore(10)

    def __init__(
        self,
        bot_service: BotService,
        channel_service: Optional[ChannelService] = None,
        notifier: Optional[Callable[[str, bool, Dict[str, Any]], Awaitable[None]]] = None,
    ):
        self.bot_service = bot_service
        self.channel_service = channel_service
        self._notifier = notifier

    async def publish_to_channel(self, channel_id: str, publication: Dict[str, Any], publication_id: str) -> Dict[str, Any]:
        """
        Универсальная публикация: текст/медиа/опросы/кнопки/автопин/альбомы.
        Возвращает {"success": bool, "message_id": int, "details": {...}}.
        """
        bot, tg_chat_id = await self.resolve_bot_and_chat(channel_id)

        reply_markup = self.build_markup(publication.get("inline_buttons"))
        text = self.escape(publication.get("text"))
        link = publication.get("link")
        media = publication.get("media") or []
        poll = publication.get("poll")
        auto_pin = bool(publication.get("auto_pin"))

        try:
            if poll:
                msg_id = await self.send_poll(bot, tg_chat_id, poll, reply_markup)
                if auto_pin and msg_id:
                    await self.pin(bot, tg_chat_id, msg_id)
                await self.notify(publication_id, True, {"message_id": msg_id})
                return {"success": True, "message_id": msg_id, "details": {"type": "poll"}}

            if media:
                msg_id = await self.send_media(bot, tg_chat_id, media, text, reply_markup)
                if auto_pin and msg_id:
                    await self.pin(bot, tg_chat_id, msg_id)
                await self.notify(publication_id, True, {"message_id": msg_id})
                return {"success": True, "message_id": msg_id, "details": {"type": "media"}}

            if text:
                msg = await self.call(lambda: bot.send_message(tg_chat_id, text, parse_mode=ParseMode.HTML, reply_markup=reply_markup, disable_web_page_preview=False))
                if auto_pin and msg and msg.message_id:
                    await self.pin(bot, tg_chat_id, msg.message_id)
                await self.notify(publication_id, True, {"message_id": msg.message_id})
                return {"success": True, "message_id": msg.message_id, "details": {"type": "text"}}

            await self.notify(publication_id, False, {"error": "empty_publication"})
            return {"success": False, "error": "empty_publication"}

        except Exception as e:
            await self.notify(publication_id, False, {"error": str(e)})
            return {"success": False, "error": str(e)}

    async def delete_message(self, channel_id: str, message_id: int) -> None:
        bot, tg_chat_id = await self.resolve_bot_and_chat(channel_id)
        await self.call(lambda: bot.delete_message(chat_id=tg_chat_id, message_id=message_id))

    async def edit_publication(self, channel_id: str, message_id: int, new_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Умеет:
          - заменить текст (editMessageText)
          - заменить подпись (editMessageCaption)
          - заменить медиа (editMessageMedia) — фото/видео/документ/аудио
        Правила:
          - если пришёл "text" без media -> правим текст
          - если media (ровно 1) и caption -> правим media+caption
          - если только caption -> правим подпись
        """
        bot, tg_chat_id = await self.resolve_bot_and_chat(channel_id)
        text = self.escape(new_data.get("text"))
        caption = self.escape(new_data.get("caption"))
        media = new_data.get("media") or []
        markup = self.build_markup(new_data.get("inline_buttons"))

        try:
            if media and len(media) == 1:
                im = self.to_input_media(media[0], caption)
                await self.call(lambda: bot.edit_message_media(chat_id=tg_chat_id, message_id=message_id, media=im, reply_markup=markup))
                return {"success": True, "edited": "media"}

            if caption is not None:
                await self.call(lambda: bot.edit_message_caption(chat_id=tg_chat_id, message_id=message_id, caption=caption, parse_mode=ParseMode.HTML, reply_markup=markup))
                return {"success": True, "edited": "caption"}

            if text is not None:
                await self.call(lambda: bot.edit_message_text(chat_id=tg_chat_id, message_id=message_id, text=text, parse_mode=ParseMode.HTML, reply_markup=markup, disable_web_page_preview=False))
                return {"success": True, "edited": "text"}

            return {"success": False, "error": "nothing_to_edit"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def resolve_bot_and_chat(self, channel_id: str) -> Tuple[Bot, str]:
        """
        Пытаемся понять, каким ботом публиковать в этот канал.
        Предпочтительно: через ChannelService (по внутреннему UUID канала найдём bot_id и telegram_chat_id).
        Если channel_id — сразу телеграмный chat_id (str/int), используем как есть и берём "дефолтного" бота (если у тебя так заведено).
        """
        if self.channel_service:
            try:
                _ = UUID(channel_id)
                ch = await self.channel_service.require(channel_id)
                bot_rec = await self.bot_service.require(ch.bot_id)
                return bot_rec.bot, ch.telegram_chat_id
            except Exception:
                pass

        bot_rec = await self.bot_service.require_default()
        return bot_rec.bot, str(channel_id)

    def build_markup(self, inline_buttons: Optional[List[List[Dict[str, Any]]]]) -> Optional[InlineKeyboardMarkup]:
        if not inline_buttons:
            return None
        rows: List[List[InlineKeyboardButton]] = []
        for row in inline_buttons:
            out_row: List[InlineKeyboardButton] = []
            for btn in row:
                text = btn.get("text") or ""
                url = btn.get("url")
                cb = btn.get("callback_data")
                if url:
                    out_row.append(InlineKeyboardButton(text=text, url=url))
                elif cb:
                    out_row.append(InlineKeyboardButton(text=text, callback_data=cb))
            if out_row:
                rows.append(out_row)
        return InlineKeyboardMarkup(rows) if rows else None

    def escape(self, s: Optional[str]) -> Optional[str]:
        return html.escape(s, quote=False) if s else s

    async def pin(self, bot: Bot, chat_id: str, message_id: int) -> None:
        await self.call(lambda: bot.pin_chat_message(chat_id=chat_id, message_id=message_id, disable_notification=True))

    async def send_poll(self, bot: Bot, chat_id: str, poll: Dict[str, Any], markup: Optional[InlineKeyboardMarkup]) -> int:
        q = poll.get("question") or ""
        opts = [o.get("text", "") if isinstance(o, dict) else str(o) for o in (poll.get("options") or [])]
        is_quiz = (poll.get("type") == "quiz") or (poll.get("quiz") is True)
        correct_id = poll.get("correct_option_id") if is_quiz else None
        allow_multi = bool(poll.get("allows_multiple_answers")) if not is_quiz else False
        is_anonymous = bool(poll.get("is_anonymous", True))
        exp = poll.get("explanation")

        if is_quiz:
            msg = await self.call(lambda: bot.send_poll(
                chat_id=chat_id,
                question=q[:300],
                options=opts[:10],
                is_anonymous=is_anonymous,
                type="quiz",
                correct_option_id=correct_id if isinstance(correct_id, int) else None,
                explanation=(exp[:200] if isinstance(exp, str) else None),
                reply_markup=markup,
            ))
        else:
            msg = await self.call(lambda: bot.send_poll(
                chat_id=chat_id,
                question=q[:300],
                options=opts[:10],
                is_anonymous=is_anonymous,
                allows_multiple_answers=allow_multi,
                reply_markup=markup,
            ))
        return msg.message_id

    async def send_media(self, bot: Bot, chat_id: str, media: List[Dict[str, Any]], caption: Optional[str], markup: Optional[InlineKeyboardMarkup]) -> int:
        """
        Один элемент -> send_*; несколько однотипных фото/видео -> sendMediaGroup.
        Разные типы в альбоме Telegram не поддерживает — отправим первым элементом и вернём его message_id.
        """
        if len(media) == 1:
            m = media[0]
            t = (m.get("type") or "").lower()
            url_or_id = m.get("url") or m.get("file_id")
            cap = self.escape(caption) if caption else None

            if t == "photo":
                msg = await self.call(lambda: bot.send_photo(chat_id=chat_id, photo=url_or_id, caption=cap, parse_mode=ParseMode.HTML, reply_markup=markup))
                return msg.message_id
            if t == "video":
                msg = await self.call(lambda: bot.send_video(chat_id=chat_id, video=url_or_id, caption=cap, parse_mode=ParseMode.HTML, reply_markup=markup))
                return msg.message_id
            if t == "document":
                msg = await self.call(lambda: bot.send_document(chat_id=chat_id, document=url_or_id, caption=cap, parse_mode=ParseMode.HTML, reply_markup=markup))
                return msg.message_id
            if t == "audio":
                msg = await self.call(lambda: bot.send_audio(chat_id=chat_id, audio=url_or_id, caption=cap, parse_mode=ParseMode.HTML, reply_markup=markup))
                return msg.message_id

            if cap:
                msg = await self.call(lambda: bot.send_message(chat_id=chat_id, text=cap, parse_mode=ParseMode.HTML, reply_markup=markup))
                return msg.message_id
            raise TelegramError("unsupported_media_type")

        types = set((m.get("type") or "").lower() for m in media)
        if types <= {"photo"} or types <= {"video"}:
            ims = []
            cap_used = False
            for i, m in enumerate(media):
                t = (m.get("type") or "").lower()
                url_or_id = m.get("url") or m.get("file_id")
                cap = (self.escape(caption) if (i == 0 and caption and not cap_used) else None)
                cap_used = cap_used or (cap is not None)
                if t == "photo":
                    ims.append(InputMediaPhoto(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None))
                else:
                    ims.append(InputMediaVideo(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None))
            msgs = await self.call(lambda: bot.send_media_group(chat_id=chat_id, media=ims))
            return msgs[0].message_id if msgs else 0

        return await self.send_media(bot, chat_id, media[:1], caption, markup)

    def to_input_media(self, m: Dict[str, Any], caption: Optional[str]):
        t = (m.get("type") or "").lower()
        url_or_id = m.get("url") or m.get("file_id")
        cap = self.escape(caption) if caption else None
        if t == "photo":
            return InputMediaPhoto(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None)
        if t == "video":
            return InputMediaVideo(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None)
        if t == "document":
            return InputMediaDocument(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None)
        if t == "audio":
            return InputMediaAudio(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None)
        return InputMediaDocument(media=url_or_id, caption=cap, parse_mode=ParseMode.HTML if cap else None)

    async def call(self, coro_factory: Callable[[], Awaitable[Any]]) -> Any:
        """
        Единая обёртка для вызовов Telegram API: семафор + retry/backoff.
        coro_factory — нулераргументная корутина (lambda: bot.send_xxx(...)).
        """
        backoff = 0.5
        for attempt in range(5):
            try:
                async with self.tg_sem:
                    return await coro_factory()
            except RetryAfter as e:
                await asyncio.sleep(getattr(e, "retry_after", 1.5))
            except TimedOut:
                if attempt == 4:
                    raise
                await asyncio.sleep(backoff)
                backoff *= 2
            except TelegramError as e:
                msg = str(e)
                if "Too Many Requests" in msg or "429" in msg:
                    await asyncio.sleep(1.25)
                    continue
                if msg.startswith("5") or "Bad Gateway" in msg or "Timeout" in msg:
                    if attempt == 4:
                        raise
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                raise

    async def notify(self, publication_id: str, ok: bool, payload: Dict[str, Any]) -> None:
        if not self._notifier:
            return
        try:
            await self._notifier(publication_id, ok, payload)
        except Exception:
            pass
