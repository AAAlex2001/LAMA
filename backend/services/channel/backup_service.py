from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from aiogram.types import Message
from fastapi import HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import (
    BackedUpPost,
    BackupMode,
    ChannelGroup,
    PostRetransmission,
)
from backend.services.channel.utils.media_utils import extract_content_type, extract_media_file_ids
from backend.services.channel.utils.query_utils import get_channel


class BackupService:
    """Бекапы постов, статистика, режим бекапа."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_mode(
        self,
        channel_id: int,
        backup_mode: BackupMode,
        backup_target_id: Optional[int] = None,
        owner_id: int = None,
    ) -> ChannelGroup:
        """Обновить режим бекапа."""
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        if backup_mode == BackupMode.INSTANT and backup_target_id:
            target = await get_channel(self.db, backup_target_id, owner_id)
            if not target:
                raise HTTPException(status_code=400, detail="Target channel not found")

        channel.backup_mode = backup_mode
        channel.backup_target_id = backup_target_id
        channel.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def save_post(self, channel_id: int, message: Message) -> BackedUpPost:
        """Сохранить пост в бекап."""
        content_type = extract_content_type(message)
        media_file_ids = extract_media_file_ids(message)
        raw_data = message.model_dump(mode="json")
        media_group_id = getattr(message, "media_group_id", None)

        if media_group_id:
            existing = await self.find_by_media_group(channel_id, str(media_group_id))
            if existing:
                return await self.merge_media_group(existing, message, media_file_ids, raw_data)

        post = BackedUpPost(
            channel_id=channel_id,
            telegram_message_id=message.message_id,
            media_group_id=str(media_group_id) if media_group_id else None,
            content_type=content_type,
            text_content=message.text or message.caption,
            media_file_ids=media_file_ids or None,
            has_spoiler=message.has_media_spoiler if hasattr(message, "has_media_spoiler") else False,
            reply_markup=message.reply_markup.model_dump(mode="json") if message.reply_markup else None,
            views_count=message.views if hasattr(message, "views") and message.views else 0,
            forwards_count=message.forwards if hasattr(message, "forwards") and message.forwards else 0,
            original_date=message.date,
            raw_data=raw_data,
        )

        try:
            self.db.add(post)
            await self.db.commit()
            await self.db.refresh(post)
        except IntegrityError:
            await self.db.rollback()
            query = select(BackedUpPost).where(
                and_(
                    BackedUpPost.channel_id == channel_id,
                    BackedUpPost.telegram_message_id == message.message_id,
                )
            )
            result = await self.db.execute(query)
            post = result.scalar_one()

        return post

    async def get_posts(
        self,
        channel_id: int,
        page: int = 1,
        page_size: int = 50,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> tuple[List[BackedUpPost], int]:
        """Получить бекапнутые посты."""
        query = select(BackedUpPost).where(BackedUpPost.channel_id == channel_id)
        count_query = select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)

        if start_date:
            query = query.where(BackedUpPost.original_date >= start_date)
            count_query = count_query.where(BackedUpPost.original_date >= start_date)
        if end_date:
            query = query.where(BackedUpPost.original_date <= end_date)
            count_query = count_query.where(BackedUpPost.original_date <= end_date)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(BackedUpPost.original_date.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        posts = list(result.scalars().all())

        return posts, total

    async def get_stats(self, channel_id: int) -> Dict[str, Any]:
        """Получить статистику канала."""
        posts_count = await self.db.execute(
            select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)
        )
        total_posts = posts_count.scalar()

        retransmissions_count = await self.db.execute(
            select(func.count(PostRetransmission.id))
            .join(BackedUpPost, PostRetransmission.original_post_id == BackedUpPost.id)
            .where(BackedUpPost.channel_id == channel_id)
        )
        total_retransmissions = retransmissions_count.scalar()

        dates_result = await self.db.execute(
            select(func.min(BackedUpPost.original_date), func.max(BackedUpPost.original_date))
            .where(BackedUpPost.channel_id == channel_id)
        )
        dates = dates_result.one()

        return {
            "channel_id": channel_id,
            "total_backed_up_posts": total_posts,
            "total_retransmissions": total_retransmissions,
            "backup_size_mb": 0.0,
            "first_post_date": dates[0],
            "last_post_date": dates[1],
        }

    async def find_by_media_group(self, channel_id: int, media_group_id: str) -> Optional[BackedUpPost]:
        """Найти пост по media_group_id."""
        query = select(BackedUpPost).where(
            BackedUpPost.channel_id == channel_id,
            BackedUpPost.media_group_id == media_group_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def merge_media_group(
        self,
        post: BackedUpPost,
        message: Message,
        media_file_ids: list,
        raw_data: dict,
    ) -> BackedUpPost:
        """Добавить медиа к существующей медиа-группе."""
        existing_ids = list(post.media_file_ids or [])
        for file_id in media_file_ids:
            if file_id not in existing_ids:
                existing_ids.append(file_id)
        post.media_file_ids = existing_ids or None

        if message.caption and not post.text_content:
            post.text_content = message.caption

        post.has_spoiler = post.has_spoiler or (
            hasattr(message, "has_media_spoiler") and message.has_media_spoiler
        )
        if message.reply_markup:
            post.reply_markup = message.reply_markup.model_dump(mode="json")

        post.views_count = (
            message.views if hasattr(message, "views") and message.views else post.views_count
        )
        post.forwards_count = (
            message.forwards if hasattr(message, "forwards") and message.forwards else post.forwards_count
        )
        post.original_date = min(post.original_date, message.date)
        post.backed_up_at = datetime.now(timezone.utc)

        if post.raw_data is None:
            post.raw_data = [raw_data]
        elif isinstance(post.raw_data, list):
            new_raw = list(post.raw_data)
            new_raw.append(raw_data)
            post.raw_data = new_raw
        else:
            post.raw_data = [post.raw_data, raw_data]

        await self.db.commit()
        await self.db.refresh(post)
        return post
