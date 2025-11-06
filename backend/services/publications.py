from __future__ import annotations
import os
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID

import httpx
from dateutil import tz
from timezonefinder import TimezoneFinder

from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.publications import (
    Publication, Channel, PublicationTarget, Tag, PublicationTag,
    ScheduledTask, TaskAction, TaskStatus, PublicationStatus
)

# -------------------------
# Telegram HTTP API client
# -------------------------

class TelegramClient:
    def __init__(self, token: str):
        self.base = f"https://api.telegram.org/bot{token}"
        self.client = httpx.AsyncClient(timeout=30)

    async def send_message(self, chat_id: int, text: str, parse_mode: Optional[str], reply_markup: Optional[dict], disable_web_page_preview: bool = False) -> int:
        payload = {"chat_id": chat_id, "text": text, "disable_web_page_preview": disable_web_page_preview}
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        r = await self.client.post(f"{self.base}/sendMessage", json=payload)
        r.raise_for_status()
        return r.json()["result"]["message_id"]

    async def send_photo(self, chat_id: int, media: str, caption: Optional[str], parse_mode: Optional[str], has_spoiler: bool, reply_markup: Optional[dict]) -> int:
        payload = {"chat_id": chat_id, "photo": media, "has_spoiler": has_spoiler}
        if caption:
            payload["caption"] = caption
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        r = await self.client.post(f"{self.base}/sendPhoto", json=payload)
        r.raise_for_status()
        return r.json()["result"]["message_id"]

    async def send_video(self, chat_id: int, media: str, caption: Optional[str], parse_mode: Optional[str], has_spoiler: bool, reply_markup: Optional[dict], duration: Optional[int], width: Optional[int], height: Optional[int]) -> int:
        payload = {"chat_id": chat_id, "video": media, "has_spoiler": has_spoiler}
        if caption:
            payload["caption"] = caption
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        if duration:
            payload["duration"] = duration
        if width:
            payload["width"] = width
        if height:
            payload["height"] = height
        r = await self.client.post(f"{self.base}/sendVideo", json=payload)
        r.raise_for_status()
        return r.json()["result"]["message_id"]

    async def send_audio(self, chat_id: int, media: str, caption: Optional[str], parse_mode: Optional[str], reply_markup: Optional[dict], duration: Optional[int]) -> int:
        payload = {"chat_id": chat_id, "audio": media}
        if caption:
            payload["caption"] = caption
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        if duration:
            payload["duration"] = duration
        r = await self.client.post(f"{self.base}/sendAudio", json=payload)
        r.raise_for_status()
        return r.json()["result"]["message_id"]

    async def send_document(self, chat_id: int, media: str, caption: Optional[str], parse_mode: Optional[str], reply_markup: Optional[dict]) -> int:
        payload = {"chat_id": chat_id, "document": media}
        if caption:
            payload["caption"] = caption
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if reply_markup:
            payload["reply_markup"] = reply_markup
        r = await self.client.post(f"{self.base}/sendDocument", json=payload)
        r.raise_for_status()
        return r.json()["result"]["message_id"]

    async def send_poll(self, chat_id: int, question: str, options: List[str], is_anonymous: bool, allows_multiple_answers: bool, is_quiz: bool, correct_option_id: Optional[int], explanation: Optional[str], reply_markup: Optional[dict]) -> int:
        payload = {
            "chat_id": chat_id,
            "question": question,
            "options": options,
            "is_anonymous": is_anonymous,
            "allows_multiple_answers": allows_multiple_answers
        }
        if is_quiz:
            payload["type"] = "quiz"
        if correct_option_id is not None:
            payload["correct_option_id"] = correct_option_id
        if explanation:
            payload["explanation"] = explanation
        if reply_markup:
            payload["reply_markup"] = reply_markup
        r = await self.client.post(f"{self.base}/sendPoll", json=payload)
        r.raise_for_status()
        return r.json()["result"]["message_id"]

    async def pin(self, chat_id: int, message_id: int) -> None:
        payload = {"chat_id": chat_id, "message_id": message_id, "disable_notification": True}
        r = await self.client.post(f"{self.base}/pinChatMessage", json=payload)
        r.raise_for_status()

    async def edit_text(self, chat_id: int, message_id: int, new_text: str, parse_mode: Optional[str]) -> None:
        payload = {"chat_id": chat_id, "message_id": message_id, "text": new_text}
        if parse_mode:
            payload["parse_mode"] = parse_mode
        r = await self.client.post(f"{self.base}/editMessageText", json=payload)
        r.raise_for_status()

    async def edit_caption(self, chat_id: int, message_id: int, new_caption: str, parse_mode: Optional[str]) -> None:
        payload = {"chat_id": chat_id, "message_id": message_id, "caption": new_caption}
        if parse_mode:
            payload["parse_mode"] = parse_mode
        r = await self.client.post(f"{self.base}/editMessageCaption", json=payload)
        r.raise_for_status()

    async def delete_message(self, chat_id: int, message_id: int) -> None:
        r = await self.client.post(f"{self.base}/deleteMessage", json={"chat_id": chat_id, "message_id": message_id})
        r.raise_for_status()

    async def close(self) -> None:
        await self.client.aclose()


def build_reply_markup(buttons: Optional[dict]) -> Optional[dict]:
    if not buttons:
        return None
    rows = []
    for row in buttons.get("rows", []):
        rows.append([b for b in ({"text": btn["text"], **({ "url": btn["url"] } if btn.get("url") else {}), **({"callback_data": btn["callback_data"]} if btn.get("callback_data") else {}), **({"switch_inline_query": btn["switch_inline_query"]} if btn.get("switch_inline_query") else {})} for btn in row)])
    return {"inline_keyboard": rows} if rows else None


# -------------------------
# Utilities
# -------------------------

def to_aware(dt: datetime, tz_name: str) -> datetime:
    if dt.tzinfo is None:
        tzinfo = tz.gettz(tz_name)
        return dt.replace(tzinfo=tzinfo)
    return dt


async def ensure_tags(session: AsyncSession, tag_names: List[str]) -> List[Tag]:
    if not tag_names:
        return []
    existing = (await session.execute(select(Tag).where(Tag.name.in_(tag_names)))).scalars().all()
    existing_names = {t.name for t in existing}
    new_tags = [Tag(name=name) for name in tag_names if name not in existing_names]
    session.add_all(new_tags)
    await session.flush()
    return list(existing) + new_tags


# -------------------------
# CRUD + Scheduling Service
# -------------------------

class PublicationService:
    def __init__(self, session: AsyncSession, tg: TelegramClient):
        self.session = session
        self.tg = tg
        self.admin_chat_id = int(os.getenv("ADMIN_CHAT_ID", "0")) or None
        self.preview_chat_id = int(os.getenv("PREVIEW_CHAT_ID", "0")) or None

    async def create_channel(self, tg_chat_id: int, title: str, timezone_str: str, is_active: bool) -> Channel:
        channel = Channel(tg_chat_id=tg_chat_id, title=title, timezone=timezone_str, is_active=is_active)
        self.session.add(channel)
        await self.session.flush()
        return channel

    async def list_channels(self) -> List[Channel]:
        return (await self.session.execute(select(Channel).order_by(Channel.created_at.desc()))).scalars().all()

    async def create_publication(self, data: dict) -> Publication:
        tags = await ensure_tags(self.session, data.get("tags", []))
        publication = Publication(
            title=data.get("title", ""),
            content=[c for c in data.get("content", [])],
            parse_mode=data.get("parse_mode", "HTML"),
            auto_pin=bool(data.get("auto_pin", False)),
            auto_delete_hours=data.get("auto_delete_hours"),
            preview_only=bool(data.get("preview_only", False)),
            tz=data.get("tz") or os.getenv("TZ_DEFAULT", "Europe/Riga"),
            status=PublicationStatus.draft,
        )
        self.session.add(publication)
        await self.session.flush()

        publication.tags = tags

        channel_ids = data.get("target_channel_ids") or []
        if channel_ids:
            channels = (await self.session.execute(select(Channel).where(Channel.id.in_(channel_ids)))).scalars().all()
            for ch in channels:
                self.session.add(PublicationTarget(publication_id=publication.id, channel_id=ch.id, status=PublicationStatus.scheduled))

        scheduled_at = data.get("scheduled_at")
        series_dates = data.get("series_dates")
        # базовое планирование
        if scheduled_at:
            publication.scheduled_at = to_aware(scheduled_at, publication.tz)
            publication.status = PublicationStatus.scheduled
            await self.schedule_publish_tasks(publication)

        # сериал публикаций
        if series_dates:
            for dtm in series_dates:
                clone = Publication(
                    title=publication.title,
                    content=publication.content,
                    parse_mode=publication.parse_mode,
                    auto_pin=publication.auto_pin,
                    auto_delete_hours=publication.auto_delete_hours,
                    preview_only=publication.preview_only,
                    tz=publication.tz,
                    status=PublicationStatus.scheduled,
                    series_id=publication.series_id
                )
                self.session.add(clone)
                await self.session.flush()

                # те же теги
                for t in tags:
                    self.session.add(PublicationTag(publication_id=clone.id, tag_id=t.id))
                # те же каналы
                targets = (await self.session.execute(select(Channel).where(Channel.id.in_(channel_ids)))).scalars().all()
                for ch in targets:
                    self.session.add(PublicationTarget(publication_id=clone.id, channel_id=ch.id, status=PublicationStatus.scheduled))

                clone.scheduled_at = to_aware(dtm, clone.tz)
                await self.schedule_publish_tasks(clone)

        await self.session.flush()
        return publication

    async def schedule_publish_tasks(self, publication: Publication) -> None:
        targets = (await self.session.execute(select(PublicationTarget).where(PublicationTarget.publication_id == publication.id))).scalars().all()
        when = publication.scheduled_at
        for t in targets:
            t.scheduled_at = when
            self.session.add(ScheduledTask(action=TaskAction.publish, publication_id=publication.id, target_id=t.id, channel_id=t.channel_id, run_at=when))

    async def update_publication(self, pid: UUID, data: dict) -> Publication:
        publication = await self.get_publication(pid)
        if "title" in data and data["title"] is not None:
            publication.title = data["title"]
        if "content" in data and data["content"] is not None:
            publication.content = data["content"]
        if "parse_mode" in data and data["parse_mode"] is not None:
            publication.parse_mode = data["parse_mode"]
        if "auto_pin" in data and data["auto_pin"] is not None:
            publication.auto_pin = data["auto_pin"]
        if "auto_delete_hours" in data:
            publication.auto_delete_hours = data["auto_delete_hours"]
        if "preview_only" in data and data["preview_only"] is not None:
            publication.preview_only = data["preview_only"]
        if "tz" in data and data["tz"] is not None:
            publication.tz = data["tz"]
        if "tags" in data and data["tags"] is not None:
            publication.tags = await ensure_tags(self.session, data["tags"])
        if "scheduled_at" in data and data["scheduled_at"]:
            publication.scheduled_at = to_aware(data["scheduled_at"], publication.tz)
            publication.status = PublicationStatus.scheduled
            # пересоздать задачи
            await self.session.execute(delete(ScheduledTask).where(ScheduledTask.publication_id == pid, ScheduledTask.action == TaskAction.publish, ScheduledTask.status == TaskStatus.pending))
            await self.schedule_publish_tasks(publication)
        if "target_channel_ids" in data and data["target_channel_ids"] is not None:
            # пересобрать таргеты
            await self.session.execute(delete(PublicationTarget).where(PublicationTarget.publication_id == pid))
            channels = (await self.session.execute(select(Channel).where(Channel.id.in_(data["target_channel_ids"])))).scalars().all()
            for ch in channels:
                self.session.add(PublicationTarget(publication_id=pid, channel_id=ch.id, status=PublicationStatus.scheduled))
            if publication.scheduled_at:
                await self.schedule_publish_tasks(publication)
        await self.session.flush()
        return publication

    async def delete_publication(self, pid: UUID) -> None:
        await self.session.execute(delete(ScheduledTask).where(ScheduledTask.publication_id == pid))
        await self.session.execute(delete(PublicationTarget).where(PublicationTarget.publication_id == pid))
        await self.session.execute(delete(Publication).where(Publication.id == pid))

    async def get_publication(self, pid: UUID) -> Publication:
        pub = (await self.session.execute(select(Publication).where(Publication.id == pid))).scalar_one()
        return pub

    async def list_publications(self, q: Optional[str], tag: Optional[str]) -> List[Publication]:
        stmt = select(Publication).order_by(Publication.created_at.desc())
        if q:
            stmt = stmt.where(Publication.title.ilike(f"%{q}%"))
        if tag:
            stmt = stmt.join(PublicationTag, PublicationTag.publication_id == Publication.id).join(Tag, Tag.id == PublicationTag.tag_id).where(Tag.name == tag)
        return (await self.session.execute(stmt)).scalars().all()

    async def preview_publication(self, pid: UUID) -> List[int]:
        publication = await self.get_publication(pid)
        if not self.preview_chat_id:
            raise ValueError("PREVIEW_CHAT_ID is not set")
        buttons = build_reply_markup(publication.content_buttons if hasattr(publication, "content_buttons") else None)
        msg_ids = await self.send_content_sequence(chat_id=self.preview_chat_id, parse_mode=publication.parse_mode, content=publication.content, buttons=None)
        return msg_ids

    async def publish_target(self, target: PublicationTarget, channel: Channel, publication: Publication) -> List[int]:
        msg_ids = await self.send_content_sequence(chat_id=channel.tg_chat_id, parse_mode=publication.parse_mode, content=publication.content, buttons=None)
        target.message_ids = msg_ids
        target.status = PublicationStatus.published
        target.sent_at = datetime.now(timezone.utc)
        await self.session.flush()

        if publication.auto_pin and msg_ids:
            self.session.add(ScheduledTask(action=TaskAction.pin, publication_id=publication.id, target_id=target.id, channel_id=channel.id, run_at=datetime.now(timezone.utc)))
        if publication.auto_delete_hours:
            auto_delete_at = datetime.now(timezone.utc) + timedelta(hours=publication.auto_delete_hours)
            target.auto_delete_at = auto_delete_at
            for mid in msg_ids:
                self.session.add(ScheduledTask(action=TaskAction.delete, publication_id=publication.id, target_id=target.id, channel_id=channel.id, run_at=auto_delete_at))
        return msg_ids

    async def send_content_sequence(self, chat_id: int, parse_mode: str, content: List[dict], buttons: Optional[dict]) -> List[int]:
        msg_ids: List[int] = []
        reply_markup = build_reply_markup(buttons) if buttons else None

        for part in content:
            kind = part.get("kind")
            if kind == "text":
                msg_id = await self.tg.send_message(chat_id, part["text"], parse_mode, reply_markup, part.get("disable_web_preview", False))
                msg_ids.append(msg_id)
            elif kind in ("image", "video", "audio", "document"):
                media = part.get("file_id") or part.get("url")
                caption = part.get("caption")
                has_spoiler = bool(part.get("has_spoiler", False))
                if kind == "image":
                    msg_id = await self.tg.send_photo(chat_id, media, caption, parse_mode, has_spoiler, reply_markup)
                elif kind == "video":
                    msg_id = await self.tg.send_video(chat_id, media, caption, parse_mode, has_spoiler, reply_markup, part.get("duration"), part.get("width"), part.get("height"))
                elif kind == "audio":
                    msg_id = await self.tg.send_audio(chat_id, media, caption, parse_mode, reply_markup, part.get("duration"))
                else:
                    msg_id = await self.tg.send_document(chat_id, media, caption, parse_mode, reply_markup)
                msg_ids.append(msg_id)
            elif kind == "link":
                text = f'<a href="{part["url"]}">{part.get("title") or part["url"]}</a>\n{part.get("caption") or ""}'
                msg_id = await self.tg.send_message(chat_id, text, "HTML", reply_markup)
                msg_ids.append(msg_id)
            elif kind == "poll":
                msg_id = await self.tg.send_poll(
                    chat_id=chat_id,
                    question=part["question"],
                    options=part["options"],
                    is_anonymous=part.get("is_anonymous", True),
                    allows_multiple_answers=part.get("allows_multiple_answers", False),
                    is_quiz=part.get("is_quiz", False),
                    correct_option_id=part.get("correct_option_id"),
                    explanation=part.get("explanation"),
                    reply_markup=reply_markup
                )
                msg_ids.append(msg_id)
            elif kind == "style":
                header = part.get("header") or ""
                footer = part.get("footer") or ""
                emojis = " ".join(part.get("emojis", []))
                if header or footer or emojis:
                    composed = "\n".join([s for s in [header, emojis, footer] if s])
                    msg_id = await self.tg.send_message(chat_id, composed, parse_mode, reply_markup)
                    msg_ids.append(msg_id)
        return msg_ids

    async def run_due_tasks(self) -> int:
        now = datetime.now(timezone.utc)
        due = (await self.session.execute(
            select(ScheduledTask).where(ScheduledTask.status == TaskStatus.pending, ScheduledTask.run_at <= now).order_by(ScheduledTask.run_at.asc())
        )).scalars().all()

        processed = 0
        for task in due:
            try:
                if task.action == TaskAction.publish:
                    target = (await self.session.execute(select(PublicationTarget).where(PublicationTarget.id == task.target_id))).scalar_one()
                    publication = (await self.session.execute(select(Publication).where(Publication.id == task.publication_id))).scalar_one()
                    channel = (await self.session.execute(select(Channel).where(Channel.id == task.channel_id))).scalar_one()
                    await self.publish_target(target, channel, publication)
                    publication.status = PublicationStatus.published
                elif task.action == TaskAction.pin:
                    target = (await self.session.execute(select(PublicationTarget).where(PublicationTarget.id == task.target_id))).scalar_one()
                    channel = (await self.session.execute(select(Channel).where(Channel.id == task.channel_id))).scalar_one()
                    if target.message_ids:
                        await self.tg.pin(channel.tg_chat_id, target.message_ids[0])
                        target.pin_applied = True
                elif task.action == TaskAction.delete:
                    target = (await self.session.execute(select(PublicationTarget).where(PublicationTarget.id == task.target_id))).scalar_one()
                    channel = (await self.session.execute(select(Channel).where(Channel.id == task.channel_id))).scalar_one()
                    if target.message_ids:
                        # удаляем все сообщения поста
                        for mid in target.message_ids:
                            try:
                                await self.tg.delete_message(channel.tg_chat_id, mid)
                            except Exception:
                                pass
                        target.status = PublicationStatus.deleted
                task.status = TaskStatus.done
                processed += 1
                if self.admin_chat_id and task.action == TaskAction.publish:
                    await self.safe_notify(f"✅ Публикация {task.publication_id} отправлена в канал {channel.title}")
            except Exception as e:
                task.attempts += 1
                task.last_error = str(e)
                task.status = TaskStatus.failed if task.attempts >= 3 else TaskStatus.pending
                if self.admin_chat_id:
                    await self.safe_notify(f"❌ Ошибка задачи {task.action} для публикации {task.publication_id}: {e}")
        await self.session.flush()
        return processed

    async def safe_notify(self, text: str) -> None:
        try:
            if self.admin_chat_id:
                await self.tg.send_message(self.admin_chat_id, text, "HTML", None)
        except Exception:
            pass

    async def edit_published(self, publication_id: UUID, channel_id: UUID, message_index: int, new_text: Optional[str], new_caption: Optional[str], parse_mode: Optional[str]) -> None:
        target = (await self.session.execute(select(PublicationTarget).where(PublicationTarget.publication_id == publication_id, PublicationTarget.channel_id == channel_id))).scalar_one()
        channel = (await self.session.execute(select(Channel).where(Channel.id == channel_id))).scalar_one()
        if not target.message_ids or message_index >= len(target.message_ids):
            raise ValueError("message_index out of range")
        mid = target.message_ids[message_index]
        if new_text:
            await self.tg.edit_text(channel.tg_chat_id, mid, new_text, parse_mode)
        if new_caption:
            await self.tg.edit_caption(channel.tg_chat_id, mid, new_caption, parse_mode)

    async def calendar_events(self) -> List[dict]:
        pubs = (await self.session.execute(select(Publication))).scalars().all()
        events = []
        for p in pubs:
            channel_ids = [t.channel_id for t in p.targets]
            events.append({
                "id": str(p.id),
                "title": p.title or "Публикация",
                "start": (p.scheduled_at or p.created_at).isoformat(),
                "end": None,
                "status": p.status.value,
                "channel_ids": [str(cid) for cid in channel_ids],
            })
        return events

    async def ai_suggest(self, text: str, instruction: Optional[str]) -> str:
        # БАЗОВЫЕ функции: если есть OPENAI_API_KEY — используем; иначе делаем простое «улучшение»
        key = os.getenv("OPENAI_API_KEY")
        if key:
            try:
                # Лёгкий вызов REST без SDK, чтобы не тащить лишние зависимости
                headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are an assistant helping to improve social media posts succinctly."},
                        {"role": "user", "content": f"Instruction: {instruction or 'Improve clarity, fix grammar, keep emojis if present.'}\nText:\n{text}"}
                    ],
                    "temperature": 0.3
                }
                async with httpx.AsyncClient(timeout=30) as c:
                    r = await c.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                    r.raise_for_status()
                    return r.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                return f"{text}".strip()
        # Фолбэк: минимальная правка — трим пробелы, нормализация переносов
        cleaned = " ".join(text.split())
        if instruction and "emoji" in instruction.lower():
            cleaned += " ✨"
        return cleaned

    def resolve_timezone_by_geo(self, lat: float, lon: float) -> Optional[str]:
        tf = TimezoneFinder()
        return tf.timezone_at(lng=lon, lat=lat)


# -------------------------
# Background minimal scheduler loop
# -------------------------

async def scheduler_loop(session_factory, tg_client: TelegramClient, stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            async with session_factory() as session:
                svc = PublicationService(session, tg_client)
                processed = await svc.run_due_tasks()
                await session.commit()
        except Exception:
            # глушим, чтобы не падал цикл
            pass
        await asyncio.sleep(5)
