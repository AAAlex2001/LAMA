from datetime import datetime, timezone
from typing import List, Optional

from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost
from backend.services.channel.utils.media_utils import extract_content_type, extract_media_file_ids


def merge_media_into_post(
    post: BackedUpPost,
    message: Message,
    media_file_ids: List[str],
    raw_data: dict,
) -> None:
    """Обновляет существующий пост медиа-группы, добавляя ему медиа из нового сообщения."""
    existing_ids = list(post.media_file_ids or [])
    for file_id in media_file_ids:
        if file_id not in existing_ids:
            existing_ids.append(file_id)
    post.media_file_ids = existing_ids or None

    if message.caption and not post.text_content:
        post.text_content = message.caption

    post.has_spoiler = post.has_spoiler or bool(getattr(message, "has_media_spoiler", False))
    if message.reply_markup:
        post.reply_markup = message.reply_markup.model_dump(mode="json")

    views = getattr(message, "views", None)
    forwards = getattr(message, "forwards", None)
    if views:
        post.views_count = views
    if forwards:
        post.forwards_count = forwards

    post.original_date = min(post.original_date, message.date)
    post.backed_up_at = datetime.now(timezone.utc)
    post.raw_data = append_raw_data(post.raw_data, raw_data)


def append_raw_data(existing, new_item: dict):
    """Добавляет ``new_item`` к raw_data поста (поддерживает None / dict / list).

    NB: при параллельных вызовах для одной медиа-группы может произойти
    last-write-wins на уровне ORM-присваивания. Для строгой гарантии нужен
    JSONB column + server-side ``raw_data || new_item`` или отдельная таблица.
    """
    if existing is None:
        return [new_item]
    if isinstance(existing, list):
        return existing + [new_item]
    return [existing, new_item]


def build_post_values(
    channel_id: int,
    message: Message,
    media_file_ids: List[str],
    raw_data: dict,
) -> dict:
    """Собирает словарь значений для INSERT нового ``BackedUpPost``."""
    media_group_id = getattr(message, "media_group_id", None)
    return {
        "channel_id": channel_id,
        "telegram_message_id": message.message_id,
        "media_group_id": str(media_group_id) if media_group_id else None,
        "content_type": extract_content_type(message),
        "text_content": message.text or message.caption,
        "media_file_ids": media_file_ids or None,
        "has_spoiler": bool(getattr(message, "has_media_spoiler", False)),
        "reply_markup": message.reply_markup.model_dump(mode="json") if message.reply_markup else None,
        "views_count": getattr(message, "views", None) or 0,
        "forwards_count": getattr(message, "forwards", None) or 0,
        "original_date": message.date,
        "raw_data": raw_data,
    }


class SavePostToBackup:
    """Сохраняет Telegram-сообщение в backup-таблицу. Объединяет медиа-группы."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, channel_id: int, message: Message) -> BackedUpPost:
        """Возвращает сохранённый или объединённый ``BackedUpPost``."""
        media_file_ids = extract_media_file_ids(message) or []
        raw_data = message.model_dump(mode="json")
        media_group_id = getattr(message, "media_group_id", None)

        if media_group_id:
            existing = await self.find_by_media_group(channel_id, str(media_group_id))
            if existing is not None:
                merge_media_into_post(existing, message, media_file_ids, raw_data)
                await self.db.flush()
                await self.db.refresh(existing)
                return existing

        return await self.upsert(channel_id, message, media_file_ids, raw_data)

    async def find_by_media_group(self, channel_id: int, media_group_id: str) -> Optional[BackedUpPost]:
        """Возвращает уже сохранённый пост этой медиа-группы или None."""
        return (await self.db.execute(
            select(BackedUpPost).where(
                BackedUpPost.channel_id == channel_id,
                BackedUpPost.media_group_id == media_group_id,
            )
        )).scalar_one_or_none()

    async def upsert(
        self,
        channel_id: int,
        message: Message,
        media_file_ids: List[str],
        raw_data: dict,
    ) -> BackedUpPost:
        """Атомарно вставляет новый пост или возвращает существующий по ``(channel_id, telegram_message_id)``."""
        values = build_post_values(channel_id, message, media_file_ids, raw_data)

        statement = pg_insert(BackedUpPost).values(**values).on_conflict_do_update(
            index_elements=["channel_id", "telegram_message_id"],
            set_={"backed_up_at": datetime.now(timezone.utc)},
        ).returning(BackedUpPost)

        result = await self.db.execute(statement)
        await self.db.flush()
        return result.scalar_one()
