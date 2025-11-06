"""
Сервис для работы с каналами/группами Telegram.
CRUD операции, синхронизация через Telegram API, бекапы и перезалив постов.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from typing import Optional, List, Any

from sqlalchemy import select, update as sa_update, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from telegram import Bot, Update
from telegram.error import TelegramError
from telegram.constants import ParseMode

from backend.models.channel import (
    ChannelCreate,
    ChannelUpdate,
    ChannelResponse,
    ChannelSyncResponse,
    BackupPostResponse,
    CopyPostsRequest,
    CopyPostsResponse,
    ChannelType,
    BackupMode,
)
from backend.models.db_models import Channel as ChannelORM, BackupPost as BackupPostORM
from backend.services.bot_service import BotService


class ChannelService:
    """Сервис управления каналами/группами, с хранением в Postgres."""

    def __init__(self, bot_service: BotService, session_factory: async_sessionmaker[AsyncSession]):
        self.bot_service = bot_service
        self.session_factory = session_factory

    async def create(self, data: ChannelCreate) -> ChannelResponse:
        """Создание нового канала/группы."""
        bot_record = await self.bot_service.require(data.bot_id)
        bot = bot_record.bot

        try:
            chat = await bot.get_chat(chat_id=data.telegram_chat_id)
        except TelegramError as e:
            raise ValueError(f"Не удалось получить доступ к каналу: {str(e)}")

        channel_type = ChannelType.CHANNEL
        if chat.type == "group":
            channel_type = ChannelType.GROUP
        elif chat.type == "supergroup":
            channel_type = ChannelType.SUPERGROUP
        elif chat.type == "channel":
            channel_type = ChannelType.CHANNEL

        # Нормализуем chat_id к числовому ID, чтобы точно матчить обновления
        normalized_chat_id = str(chat.id)

        async with self.session_factory() as session:
            orm = ChannelORM(
                telegram_chat_id=normalized_chat_id,
                bot_id=data.bot_id,
                name=(data.name or chat.title),
                username=getattr(chat, "username", None),
                type=channel_type.value,
                description=getattr(chat, "description", None),
                backup_mode=data.backup_mode.value,
                backup_channel_id=data.backup_channel_id,
                auto_sync=True,
            )
            await session.merge(orm)  # merge allows id defaults; we just add new
            session.add(orm)
            await session.flush()

            # Дополнительная синхронизация: участники и фото
            await self.sync_channel_data(session, orm, bot, chat)
            await session.commit()
            await session.refresh(orm)

            return self.to_response(orm)

    async def list(self) -> List[ChannelResponse]:
        """Получение списка всех каналов (из БД)."""
        async with self.session_factory() as session:
            res = await session.execute(select(ChannelORM))
            rows = res.scalars().all()
            return [self.to_response(o) for o in rows]

    async def get(self, channel_id: str) -> ChannelResponse:
        orm = await self.require(channel_id)
        return self.to_response(orm)

    async def update(self, channel_id: str, data: ChannelUpdate) -> ChannelResponse:
        orm = await self.require(channel_id)
        if data.backup_mode == BackupMode.INSTANT and not (data.backup_channel_id or orm.backup_channel_id):
            raise ValueError("Для режима instant требуется backup_channel_id")

        async with self.session_factory() as session:
            stmt = (
                sa_update(ChannelORM)
                .where(ChannelORM.id == orm.id)
                .values(
                    name=data.name if data.name is not None else ChannelORM.name,
                    backup_mode=(data.backup_mode.value if data.backup_mode is not None else ChannelORM.backup_mode),
                    backup_channel_id=(data.backup_channel_id if data.backup_channel_id is not None else ChannelORM.backup_channel_id),
                    auto_sync=(data.auto_sync if data.auto_sync is not None else ChannelORM.auto_sync),
                    updated_at=datetime.utcnow(),
                )
                .returning(ChannelORM)
            )
            res = await session.execute(stmt)
            await session.commit()
            updated = res.fetchone()[0]
            return self.to_response(updated)

    async def delete(self, channel_id: str) -> bool:
        try:
            cid = uuid.UUID(channel_id)
        except Exception:
            return False
        async with self.session_factory() as session:
            res = await session.execute(sa_delete(ChannelORM).where(ChannelORM.id == cid))
            await session.commit()
            return res.rowcount and res.rowcount > 0

    async def sync_channel(self, channel_id: str) -> ChannelSyncResponse:
        orm = await self.require(channel_id)
        bot_record = await self.bot_service.require(orm.bot_id)
        bot = bot_record.bot

        try:
            chat = await bot.get_chat(chat_id=orm.telegram_chat_id)
            async with self.session_factory() as session:
                # refresh instance from DB in this session
                orm_db = await session.get(ChannelORM, orm.id)
                await self.sync_channel_data(session, orm_db, bot, chat)
                orm_db.last_sync_at = datetime.utcnow()
                orm_db.updated_at = datetime.utcnow()
                await session.commit()
                await session.refresh(orm_db)
                return ChannelSyncResponse(
                    success=True,
                    channel_id=str(orm_db.id),
                    synced_data={
                        "name": orm_db.name,
                        "username": orm_db.username,
                        "description": orm_db.description,
                        "members_count": orm_db.members_count,
                        "photo_url": orm_db.photo_url,
                    },
                )
        except TelegramError as e:
            return ChannelSyncResponse(success=False, channel_id=channel_id, error=str(e))

    async def sync_channel_data(self, session: AsyncSession, orm: ChannelORM, bot: Bot, chat: Any):
        """Синхронизация данных канала."""
        orm.name = chat.title or orm.name
        orm.username = getattr(chat, "username", None)
        orm.description = getattr(chat, "description", None)

        try:
            if chat.type in ["group", "supergroup"]:
                members_count = await bot.get_chat_members_count(chat_id=orm.telegram_chat_id)
                orm.members_count = members_count
        except TelegramError:
            pass

        try:
            photos = await bot.get_chat_photos(chat_id=orm.telegram_chat_id, limit=1)
            if photos and photos.total_count > 0:
                photo_file = await bot.get_file(photos.photos[0][-1].file_id)
                orm.photo_url = photo_file.file_path
        except TelegramError:
            pass

    async def save_post_backup(self, channel_id: str, message: Any) -> BackupPostORM:
        orm = await self.require(channel_id)
        media = None
        if getattr(message, "photo", None):
            media = [{"type": "photo", "file_id": message.photo[-1].file_id}]
        elif getattr(message, "video", None):
            media = [{"type": "video", "file_id": message.video.file_id}]
        elif getattr(message, "document", None):
            media = [{"type": "document", "file_id": message.document.file_id}]
        elif getattr(message, "audio", None):
            media = [{"type": "audio", "file_id": message.audio.file_id}]
        elif getattr(message, "media_group_id", None):
            media = [{"type": "media_group", "media_group_id": message.media_group_id}]

        inline_buttons = None
        if getattr(message, "reply_markup", None) and hasattr(message.reply_markup, "inline_keyboard"):
            kb = []
            for row in message.reply_markup.inline_keyboard:
                btn_row = []
                for btn in row:
                    btn_row.append({
                        "text": btn.text,
                        "url": getattr(btn, "url", None),
                        "callback_data": getattr(btn, "callback_data", None),
                    })
                kb.append(btn_row)
            inline_buttons = kb

        async with self.session_factory() as session:
            bp = BackupPostORM(
                channel_id=orm.id,
                message_id=message.message_id,
                text=getattr(message, "text", None) or getattr(message, "caption", None),
                media=media,
                inline_buttons=inline_buttons,
                date=message.date,
                original_chat_id=orm.telegram_chat_id,
            )
            session.add(bp)
            await session.flush()

            # Если режим instant — пересылаем сразу
            if orm.backup_mode == BackupMode.INSTANT.value and orm.backup_channel_id:
                await self.forward_to_backup(orm, bp)

            await session.commit()
            await session.refresh(bp)
            return bp

    async def forward_to_backup(self, record: ChannelORM, post_backup: BackupPostORM):
        """Пересылка поста в канал-ретранслятор (для режима instant)."""
        bot_record = await self.bot_service.require(record.bot_id)
        bot = bot_record.bot

        try:
            # Пересылаем сообщение
            await bot.forward_message(chat_id=record.backup_channel_id, from_chat_id=record.telegram_chat_id, message_id=post_backup.message_id)
        except TelegramError as e:
            print(f"Ошибка при пересылке в backup канал: {e}")

    async def get_backup_posts(self, channel_id: str) -> List[BackupPostResponse]:
        orm = await self.require(channel_id)
        async with self.session_factory() as session:
            res = await session.execute(
                select(BackupPostORM).where(BackupPostORM.channel_id == orm.id).order_by(BackupPostORM.date.desc())
            )
            posts = res.scalars().all()
            return [
                BackupPostResponse(
                    id=str(p.id),
                    message_id=p.message_id,
                    channel_id=str(orm.id),
                    date=p.date,
                    has_media=bool(p.media),
                    has_text=bool(p.text),
                )
                for p in posts
            ]

    async def copy_posts(self, data: CopyPostsRequest) -> CopyPostsResponse:
        """Копирование постов из одного канала в другой (для режима postfactum)."""
        source_record = await self.require(data.source_channel_id)
        target_record = await self.require(data.target_channel_id)

        source_bot = (await self.bot_service.require(source_record.bot_id)).bot
        target_bot = (await self.bot_service.require(target_record.bot_id)).bot

        async with self.session_factory() as session:
            q = select(BackupPostORM).where(BackupPostORM.channel_id == source_record.id).order_by(BackupPostORM.date.desc())
            res = await session.execute(q)
            source_posts = list(res.scalars().all())

        # Фильтруем по датам, если указаны
        if data.start_date or data.end_date:
            filtered_posts = []
            for post in source_posts:
                if data.start_date and post.date < data.start_date:
                    continue
                if data.end_date and post.date > data.end_date:
                    continue
                filtered_posts.append(post)
            source_posts = filtered_posts

        # Ограничиваем количество
        if data.limit:
            source_posts = source_posts[:data.limit]

        copied_count = 0
        errors = []

        # Копируем посты
        for post in source_posts:
            try:
                await self.copy_single_post(post, source_bot, target_bot, target_record.telegram_chat_id)
                copied_count += 1
                # Небольшая задержка, чтобы не превысить лимиты API
                await asyncio.sleep(0.1)
            except Exception as e:
                errors.append(f"Ошибка при копировании поста {post.message_id}: {str(e)}")

        return CopyPostsResponse(
            success=len(errors) == 0,
            copied_count=copied_count,
            source_channel_id=data.source_channel_id,
            target_channel_id=data.target_channel_id,
            error="; ".join(errors) if errors else None,
        )

    async def copy_single_post(self, post: BackupPostORM, source_bot: Bot, target_bot: Bot, target_chat_id: str):
        """Копирование одного поста."""
        # Если есть медиа, отправляем медиа с текстом
        if post.media and len(post.media) > 0:
            media_item = post.media[0]
            text = post.text or ""

            if media_item["type"] == "photo":
                # Получаем файл из исходного канала
                file = await source_bot.get_file(media_item["file_id"])
                # Отправляем в целевой канал
                await target_bot.send_photo(
                    chat_id=target_chat_id,
                    photo=file.file_path,
                    caption=text,
                    parse_mode=ParseMode.HTML,
                )
            elif media_item["type"] == "video":
                file = await source_bot.get_file(media_item["file_id"])
                await target_bot.send_video(
                    chat_id=target_chat_id,
                    video=file.file_path,
                    caption=text,
                    parse_mode=ParseMode.HTML,
                )
            elif media_item["type"] == "document":
                file = await source_bot.get_file(media_item["file_id"])
                await target_bot.send_document(
                    chat_id=target_chat_id,
                    document=file.file_path,
                    caption=text,
                    parse_mode=ParseMode.HTML,
                )
            elif media_item["type"] == "audio":
                file = await source_bot.get_file(media_item["file_id"])
                await target_bot.send_audio(
                    chat_id=target_chat_id,
                    audio=file.file_path,
                    caption=text,
                    parse_mode=ParseMode.HTML,
                )
        else:
            # Отправляем только текст
            if post.text:
                reply_markup = None
                # Восстанавливаем inline кнопки, если они были
                if post.inline_buttons:
                    from telegram import InlineKeyboardMarkup, InlineKeyboardButton
                    keyboard = []
                    for row in post.inline_buttons:
                        button_row = []
                        for btn in row:
                            if btn.get("url"):
                                button_row.append(InlineKeyboardButton(text=btn["text"], url=btn["url"]))
                            elif btn.get("callback_data"):
                                button_row.append(InlineKeyboardButton(text=btn["text"], callback_data=btn["callback_data"]))
                        if button_row:
                            keyboard.append(button_row)
                    if keyboard:
                        reply_markup = InlineKeyboardMarkup(keyboard)

                await target_bot.send_message(
                    chat_id=target_chat_id,
                    text=post.text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=reply_markup,
                )

    async def fetch_channel_history(self, channel_id: str, limit: Optional[int] = None, offset: int = 0) -> List[BackupPostORM]:
        orm = await self.require(channel_id)
        async with self.session_factory() as session:
            q = (
                select(BackupPostORM)
                .where(BackupPostORM.channel_id == orm.id)
                .order_by(BackupPostORM.date.desc())
            )
            res = await session.execute(q)
            posts = list(res.scalars().all())
            if limit is not None:
                return posts[offset: offset + limit]
            return posts[offset:]

    async def process_telegram_update(self, bot_id: str, update_data: dict):
        """Обработка обновления от Telegram: автосохранение постов в бекап."""
        record = await self.bot_service.require(bot_id)
        update = Update.de_json(update_data, record.bot)

        message = update.channel_post or update.message
        if not message or not message.chat:
            return
        chat_id = str(message.chat.id)

        async with self.session_factory() as session:
            res = await session.execute(
                select(ChannelORM).where(
                    ChannelORM.bot_id == bot_id, ChannelORM.telegram_chat_id == chat_id
                )
            )
            orm = res.scalar_one_or_none()
            if not orm:
                return

        await self.save_post_backup(str(orm.id), message)

    async def require(self, channel_id: str) -> ChannelORM:
        try:
            cid = uuid.UUID(channel_id)
        except Exception:
            raise ValueError(f"Канал с ID {channel_id} не найден")
        async with self.session_factory() as session:
            obj = await session.get(ChannelORM, cid)
            if not obj:
                raise ValueError(f"Канал с ID {channel_id} не найден")
            return obj

    def to_response(self, orm: ChannelORM) -> ChannelResponse:
        return ChannelResponse(
            id=str(orm.id),
            telegram_chat_id=orm.telegram_chat_id,
            bot_id=orm.bot_id,
            name=orm.name,
            username=orm.username,
            type=ChannelType(orm.type),
            description=orm.description,
            members_count=orm.members_count,
            photo_url=orm.photo_url,
            backup_mode=BackupMode(orm.backup_mode),
            backup_channel_id=orm.backup_channel_id,
            auto_sync=bool(orm.auto_sync),
            last_sync_at=orm.last_sync_at,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )


__all__ = ["ChannelService"]

