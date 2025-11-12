import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.types import Chat, Message, InputMediaPhoto, InputMediaVideo, InputMediaDocument, InputMediaAudio, InputMediaAnimation
from aiogram.exceptions import TelegramBadRequest, TelegramRetryAfter, TelegramForbiddenError
from backend.models.channels import (
    ChannelGroup, BackedUpPost, PostRetransmission, BackupJob,
    ChannelType, BackupMode, BackupStatus
)
from backend.schemas.channels import (
    ChannelGroupCreate, ChannelGroupUpdate,
    BackupJobCreate
)


class ChannelService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.telegram_semaphore = asyncio.Semaphore(10)
    
    def create_bot(self, token: str) -> Bot:
        """Создать экземпляр Bot из токена"""
        return Bot(token=token)
    
    async def get_bot_for_channel(self, channel: ChannelGroup) -> Bot:
        """Получить бота для канала"""
        if not channel.bot or not channel.bot.token:
            raise ValueError(f"Channel {channel.id} does not have an associated bot")
        return self.create_bot(channel.bot.token)

    async def create_channel(self, data: ChannelGroupCreate, owner_id: int) -> ChannelGroup:
        """Создание канала/группы с проверкой на дубликаты"""
        query = select(ChannelGroup).where(
            ChannelGroup.telegram_id == data.telegram_id,
            ChannelGroup.owner_id == owner_id
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            return existing
        
        channel = ChannelGroup(
            owner_id=owner_id,
            telegram_id=data.telegram_id,
            channel_type=data.channel_type,
            title=data.title,
            username=data.username,
            description=data.description,
            is_active=True
        )
        
        self.db.add(channel)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def get_channel(self, channel_id: int, owner_id: Optional[int] = None) -> Optional[ChannelGroup]:
        """Получение канала по ID с проверкой владельца"""
        query = select(ChannelGroup).options(selectinload(ChannelGroup.bot)).where(
            ChannelGroup.id == channel_id
        )
        if owner_id is not None:
            query = query.where(ChannelGroup.owner_id == owner_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_channel_by_telegram_id(self, telegram_id: int) -> Optional[ChannelGroup]:
        """Получение канала по Telegram ID"""
        query = select(ChannelGroup).where(ChannelGroup.telegram_id == telegram_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_channels(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        channel_type: Optional[ChannelType] = None,
        is_active: Optional[bool] = None,
        backup_mode: Optional[BackupMode] = None
    ) -> tuple[List[ChannelGroup], int]:
        """Список каналов с фильтрацией и пагинацией"""
        query = select(ChannelGroup).where(ChannelGroup.owner_id == owner_id)
        count_query = select(func.count(distinct(ChannelGroup.id))).where(ChannelGroup.owner_id == owner_id)
        
        if channel_type:
            query = query.where(ChannelGroup.channel_type == channel_type)
            count_query = count_query.where(ChannelGroup.channel_type == channel_type)
        
        if is_active is not None:
            query = query.where(ChannelGroup.is_active == is_active)
            count_query = count_query.where(ChannelGroup.is_active == is_active)
        
        if backup_mode:
            query = query.where(ChannelGroup.backup_mode == backup_mode)
            count_query = count_query.where(ChannelGroup.backup_mode == backup_mode)
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        query = query.order_by(ChannelGroup.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        channels = list(result.scalars().all())
        
        return channels, total

    async def update_channel(self, channel_id: int, data: ChannelGroupUpdate, owner_id: int) -> Optional[ChannelGroup]:
        """Обновление информации о канале"""
        channel = await self.get_channel(channel_id, owner_id=owner_id)
        if not channel:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(channel, field, value)
        
        channel.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def delete_channel(self, channel_id: int, owner_id: int) -> bool:
        """Удаление канала"""
        channel = await self.get_channel(channel_id, owner_id=owner_id)
        if not channel:
            return False
        
        await self.db.delete(channel)
        await self.db.commit()
        return True

    async def sync_channel_from_telegram(
        self, 
        telegram_id: int, 
        owner_id: int,
        bot_id: Optional[int] = None,
        token: Optional[str] = None
    ) -> ChannelGroup:
        """Синхронизация информации о канале через Telegram API"""
        # Проверяем, что передан либо bot_id, либо token
        if not bot_id and not token:
            raise ValueError("Either bot_id or token must be provided")
        
        # Если передан token, создаём/находим бота
        if token and not bot_id:
            from backend.models.bots import Bot as BotModel
            from backend.services.bots import BotService
            bot_service = BotService(self.db)
            bot_model = await bot_service.sync_bot_from_telegram(token, owner_id=owner_id)
            bot_id = bot_model.id
        
        # Получаем бота из базы
        from backend.models.bots import Bot as BotModel
        bot_query = select(BotModel).where(
            BotModel.id == bot_id,
            BotModel.owner_id == owner_id
        )
        bot_result = await self.db.execute(bot_query)
        bot_model = bot_result.scalar_one_or_none()
        
        if not bot_model:
            raise ValueError("Bot not found or does not belong to user")
        
        # Создаём aiogram Bot для API-запросов
        bot = self.create_bot(bot_model.token)
        
        try:
            chat: Chat = await bot.get_chat(telegram_id)
            
            channel_type = ChannelType.CHANNEL
            if chat.type == "group":
                channel_type = ChannelType.GROUP
            elif chat.type == "supergroup":
                channel_type = ChannelType.SUPERGROUP
            
            members_count = 0
            try:
                members_count = await bot.get_chat_member_count(telegram_id)
            except Exception:
                pass
            
            photo_url = None
            if chat.photo:
                try:
                    photo_file = await bot.get_file(chat.photo.big_file_id)
                    photo_url = f"https://api.telegram.org/file/bot{bot.token}/{photo_file.file_path}"
                except Exception:
                    pass
            
            extra_data = {
                "type": chat.type,
                "bio": chat.bio if hasattr(chat, "bio") else None,
                "linked_chat_id": chat.linked_chat_id if hasattr(chat, "linked_chat_id") else None,
                "has_protected_content": chat.has_protected_content if hasattr(chat, "has_protected_content") else False,
            }
            
            channel = await self.get_channel_by_telegram_id(telegram_id)
            
            if channel:
                # Проверяем владельца
                if channel.owner_id != owner_id:
                    raise ValueError("Channel belongs to another user")
                    
                channel.title = chat.title or channel.title
                channel.username = chat.username
                channel.description = chat.description
                channel.invite_link = chat.invite_link
                channel.members_count = members_count
                channel.photo_url = photo_url
                channel.extra_data = extra_data
                channel.bot_id = bot_id
                channel.last_sync_at = datetime.now(timezone.utc)
                channel.updated_at = datetime.now(timezone.utc)
            else:
                channel = ChannelGroup(
                    owner_id=owner_id,
                    bot_id=bot_id,
                    telegram_id=telegram_id,
                    channel_type=channel_type,
                    title=chat.title or f"Channel {telegram_id}",
                    username=chat.username,
                    description=chat.description,
                    invite_link=chat.invite_link,
                    members_count=members_count,
                    photo_url=photo_url,
                    extra_data=extra_data,
                    last_sync_at=datetime.now(timezone.utc),
                    is_active=True
                )
                self.db.add(channel)
            
            await self.db.commit()
            await self.db.refresh(channel)
            return channel
            
        except TelegramForbiddenError:
            raise ValueError("Bot doesn't have access to this channel/group")
        except TelegramBadRequest as e:
            raise ValueError(f"Invalid channel/group: {str(e)}")

    async def update_backup_mode(
        self,
        channel_id: int,
        backup_mode: BackupMode,
        backup_target_id: Optional[int] = None,
        owner_id: int = None
    ) -> Optional[ChannelGroup]:
        """Обновление режима бекапа для канала"""
        channel = await self.get_channel(channel_id, owner_id=owner_id)
        if not channel:
            return None
        
        if backup_mode == BackupMode.INSTANT and backup_target_id:
            target = await self.get_channel(backup_target_id, owner_id=owner_id)
            if not target:
                raise ValueError("Target channel not found")
        
        channel.backup_mode = backup_mode
        channel.backup_target_id = backup_target_id
        channel.updated_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(channel)
        return channel

    async def save_post_backup(self, channel_id: int, message: Message) -> BackedUpPost:
        """Сохранение поста в бекап"""
        content_type = "text"
        media_urls = []
        media_file_ids = []
        
        if message.photo:
            content_type = "photo"
            media_file_ids = [message.photo[-1].file_id]
        elif message.video:
            content_type = "video"
            media_file_ids = [message.video.file_id]
        elif message.document:
            content_type = "document"
            media_file_ids = [message.document.file_id]
        elif message.audio:
            content_type = "audio"
            media_file_ids = [message.audio.file_id]
        elif message.voice:
            content_type = "voice"
            media_file_ids = [message.voice.file_id]
        elif message.animation:
            content_type = "animation"
            media_file_ids = [message.animation.file_id]
        elif message.sticker:
            content_type = "sticker"
            media_file_ids = [message.sticker.file_id]
        
        raw_data = message.model_dump(mode="json")
        media_group_id = getattr(message, "media_group_id", None)

        existing_post = None
        if media_group_id:
            query = select(BackedUpPost).where(
                BackedUpPost.channel_id == channel_id,
                BackedUpPost.media_group_id == str(media_group_id)
            )
            result = await self.db.execute(query)
            existing_post = result.scalar_one_or_none()

        if existing_post:
            existing_media_ids = list(existing_post.media_file_ids or [])
            if media_file_ids:
                for file_id in media_file_ids:
                    if file_id not in existing_media_ids:
                        existing_media_ids.append(file_id)
            existing_post.media_file_ids = existing_media_ids or None

            if message.caption and not existing_post.text_content:
                existing_post.text_content = message.caption

            existing_post.has_spoiler = existing_post.has_spoiler or (
                hasattr(message, "has_media_spoiler") and message.has_media_spoiler
            )

            if message.reply_markup:
                existing_post.reply_markup = message.reply_markup.model_dump(mode="json")

            existing_post.views_count = (
                message.views if hasattr(message, "views") and message.views else existing_post.views_count
            )
            existing_post.forwards_count = (
                message.forwards if hasattr(message, "forwards") and message.forwards else existing_post.forwards_count
            )
            existing_post.original_date = min(existing_post.original_date, message.date)
            existing_post.backed_up_at = datetime.now(timezone.utc)

            if existing_post.raw_data is None:
                existing_post.raw_data = [raw_data]
            elif isinstance(existing_post.raw_data, list):
                new_raw = list(existing_post.raw_data)
                new_raw.append(raw_data)
                existing_post.raw_data = new_raw
            else:
                existing_post.raw_data = [existing_post.raw_data, raw_data]

            await self.db.commit()
            await self.db.refresh(existing_post)
            return existing_post

        backed_up_post = BackedUpPost(
            channel_id=channel_id,
            telegram_message_id=message.message_id,
            media_group_id=str(media_group_id) if media_group_id else None,
            content_type=content_type,
            text_content=message.text or message.caption,
            media_urls=media_urls if media_urls else None,
            media_file_ids=media_file_ids if media_file_ids else None,
            has_spoiler=message.has_media_spoiler if hasattr(message, "has_media_spoiler") else False,
            reply_markup=message.reply_markup.model_dump(mode="json") if message.reply_markup else None,
            views_count=message.views if hasattr(message, "views") and message.views else 0,
            forwards_count=message.forwards if hasattr(message, "forwards") and message.forwards else 0,
            original_date=message.date,
            raw_data=raw_data
        )
        
        try:
            self.db.add(backed_up_post)
            await self.db.commit()
            await self.db.refresh(backed_up_post)
        except IntegrityError:
            await self.db.rollback()
            query = select(BackedUpPost).where(
                and_(
                    BackedUpPost.channel_id == channel_id,
                    BackedUpPost.telegram_message_id == message.message_id
                )
            )
            result = await self.db.execute(query)
            backed_up_post = result.scalar_one()
        
        return backed_up_post

    async def retransmit_post(
        self,
        original_post: BackedUpPost,
        target_channel_id: int
    ) -> PostRetransmission:
        """Ретрансляция поста в другой канал"""
        target_channel = await self.get_channel(target_channel_id)
        if not target_channel:
            raise ValueError("Target channel not found")
        
        bot = await self.get_bot_for_channel(target_channel)
        
        success = True
        error_message = None
        target_message_id = 0
        
        try:
            async with self.telegram_semaphore:
                sent_message = await self.copy_message_to_channel(
                    original_post,
                    target_channel.telegram_id,
                    bot
                )
                target_message_id = sent_message.message_id
        except Exception as e:
            success = False
            error_message = str(e)
        
        retransmission = PostRetransmission(
            original_post_id=original_post.id,
            target_channel_id=target_channel_id,
            target_message_id=target_message_id,
            success=success,
            error_message=error_message
        )
        
        self.db.add(retransmission)
        await self.db.commit()
        await self.db.refresh(retransmission)
        return retransmission

    async def copy_message_to_channel(self, post: BackedUpPost, target_telegram_id: int, bot: Bot) -> Message:
        """Копирование сообщения в канал с обработкой ретраев"""
        for attempt in range(5):
            try:
                if post.media_group_id and post.media_file_ids and len(post.media_file_ids) > 1:
                    media_inputs = []
                    raw_entries = post.raw_data if isinstance(post.raw_data, list) else [post.raw_data]
                    for index, entry in enumerate(raw_entries):
                        caption = post.text_content if index == 0 else None
                        parse_mode = ParseMode.HTML if caption else None
                        has_spoiler = entry.get("has_media_spoiler") if isinstance(entry, dict) else False

                        if isinstance(entry, dict) and entry.get("photo"):
                            file_id = entry["photo"][-1]["file_id"]
                            media_inputs.append(
                                InputMediaPhoto(
                                    media=file_id,
                                    caption=caption,
                                    parse_mode=parse_mode,
                                    has_spoiler=has_spoiler
                                )
                            )
                        elif isinstance(entry, dict) and entry.get("video"):
                            file_id = entry["video"]["file_id"]
                            media_inputs.append(
                                InputMediaVideo(
                                    media=file_id,
                                    caption=caption,
                                    parse_mode=parse_mode,
                                    has_spoiler=has_spoiler
                                )
                            )
                        elif isinstance(entry, dict) and entry.get("document"):
                            file_id = entry["document"]["file_id"]
                            media_inputs.append(
                                InputMediaDocument(
                                    media=file_id,
                                    caption=caption,
                                    parse_mode=parse_mode
                                )
                            )
                        elif isinstance(entry, dict) and entry.get("audio"):
                            file_id = entry["audio"]["file_id"]
                            media_inputs.append(
                                InputMediaAudio(
                                    media=file_id,
                                    caption=caption,
                                    parse_mode=parse_mode
                                )
                            )
                        elif isinstance(entry, dict) and entry.get("animation"):
                            file_id = entry["animation"]["file_id"]
                            media_inputs.append(
                                InputMediaAnimation(
                                    media=file_id,
                                    caption=caption,
                                    parse_mode=parse_mode,
                                    has_spoiler=has_spoiler
                                )
                            )

                    if media_inputs:
                        messages = await bot.send_media_group(
                            chat_id=target_telegram_id,
                            media=media_inputs
                        )
                        return messages[0]

                if post.content_type == "text":
                    return await bot.send_message(
                        chat_id=target_telegram_id,
                        text=post.text_content or "Empty message",
                        reply_markup=post.reply_markup
                    )
                elif post.content_type == "photo" and post.media_file_ids:
                    return await bot.send_photo(
                        chat_id=target_telegram_id,
                        photo=post.media_file_ids[0],
                        caption=post.text_content,
                        reply_markup=post.reply_markup,
                        has_spoiler=post.has_spoiler
                    )
                elif post.content_type == "video" and post.media_file_ids:
                    return await bot.send_video(
                        chat_id=target_telegram_id,
                        video=post.media_file_ids[0],
                        caption=post.text_content,
                        reply_markup=post.reply_markup,
                        has_spoiler=post.has_spoiler
                    )
                elif post.content_type == "document" and post.media_file_ids:
                    return await bot.send_document(
                        chat_id=target_telegram_id,
                        document=post.media_file_ids[0],
                        caption=post.text_content,
                        reply_markup=post.reply_markup
                    )
                elif post.content_type == "audio" and post.media_file_ids:
                    return await bot.send_audio(
                        chat_id=target_telegram_id,
                        audio=post.media_file_ids[0],
                        caption=post.text_content,
                        reply_markup=post.reply_markup
                    )
                elif post.content_type == "sticker" and post.media_file_ids:
                    return await bot.send_sticker(
                        chat_id=target_telegram_id,
                        sticker=post.media_file_ids[0],
                        reply_markup=post.reply_markup
                    )
                else:
                    return await bot.send_message(
                        chat_id=target_telegram_id,
                        text=post.text_content or "Unsupported content type"
                    )
            except TelegramRetryAfter as e:
                if attempt < 4:
                    await asyncio.sleep(e.retry_after)
                else:
                    raise
            except Exception as e:
                if attempt < 4:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

    async def get_backed_up_posts(
        self,
        channel_id: int,
        page: int = 1,
        page_size: int = 50,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> tuple[List[BackedUpPost], int]:
        """Получение списка бекапнутых постов"""
        query = select(BackedUpPost).where(BackedUpPost.channel_id == channel_id)
        count_query = select(func.count(BackedUpPost.id)).where(BackedUpPost.channel_id == channel_id)
        
        if start_date:
            query = query.where(BackedUpPost.original_date >= start_date)
            count_query = count_query.where(BackedUpPost.original_date >= start_date)
        
        if end_date:
            query = query.where(BackedUpPost.original_date <= end_date)
            count_query = count_query.where(BackedUpPost.original_date <= end_date)
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        query = query.order_by(BackedUpPost.original_date.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        posts = list(result.scalars().all())
        
        return posts, total

    async def create_backup_job(self, data: BackupJobCreate, owner_id: int) -> BackupJob:
        """Создание задачи на полное копирование канала"""
        source = await self.get_channel(data.source_channel_id, owner_id=owner_id)
        target = await self.get_channel(data.target_channel_id, owner_id=owner_id)
        
        if not source or not target:
            raise ValueError("Source or target channel not found")
        
        query = select(func.count(BackedUpPost.id)).where(
            BackedUpPost.channel_id == data.source_channel_id
        )
        result = await self.db.execute(query)
        total_posts = result.scalar()
        
        job = BackupJob(
            source_channel_id=data.source_channel_id,
            target_channel_id=data.target_channel_id,
            status=BackupStatus.IN_PROGRESS,
            total_posts=total_posts,
            processed_posts=0,
            failed_posts=0
        )
        
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def process_backup_job(self, job_id: int) -> BackupJob:
        """Обработка задачи бекапа (копирование всех постов)"""
        query = select(BackupJob).where(BackupJob.id == job_id)
        result = await self.db.execute(query)
        job = result.scalar_one_or_none()
        
        if not job:
            raise ValueError("Backup job not found")
        
        if job.status != BackupStatus.IN_PROGRESS:
            return job
        
        query = select(BackedUpPost).where(
            BackedUpPost.channel_id == job.source_channel_id
        ).order_by(BackedUpPost.original_date.asc())
        
        result = await self.db.execute(query)
        posts = list(result.scalars().all())
        
        job.total_posts = len(posts)
        await self.db.commit()
        
        for post in posts:
            try:
                await self.retransmit_post(post, job.target_channel_id)
                job.processed_posts += 1
            except Exception as e:
                job.failed_posts += 1
                if not job.error_details:
                    job.error_details = []
                job.error_details.append({
                    "post_id": post.id,
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            if job.processed_posts % 10 == 0:
                await self.db.commit()
        
        if job.failed_posts == 0:
            job.status = BackupStatus.COMPLETED
        elif job.processed_posts > 0:
            job.status = BackupStatus.ACTIVE
        else:
            job.status = BackupStatus.FAILED
        
        job.completed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def get_backup_jobs(
        self,
        owner_id: int,
        page: int = 1,
        page_size: int = 50,
        status: Optional[BackupStatus] = None
    ) -> tuple[List[BackupJob], int]:
        """Получение списка задач бекапа"""
        query = select(BackupJob).where(BackupJob.owner_id == owner_id)
        count_query = select(func.count(BackupJob.id)).where(BackupJob.owner_id == owner_id)
        
        if status:
            query = query.where(BackupJob.status == status)
            count_query = count_query.where(BackupJob.status == status)
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        query = query.order_by(BackupJob.started_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        jobs = list(result.scalars().all())
        
        return jobs, total

    async def get_channel_stats(self, channel_id: int) -> Dict[str, Any]:
        """Получение статистики по каналу"""
        query = select(func.count(BackedUpPost.id)).where(
            BackedUpPost.channel_id == channel_id
        )
        result = await self.db.execute(query)
        total_posts = result.scalar()
        
        query = select(func.count(PostRetransmission.id)).join(
            BackedUpPost, PostRetransmission.original_post_id == BackedUpPost.id
        ).where(BackedUpPost.channel_id == channel_id)
        result = await self.db.execute(query)
        total_retransmissions = result.scalar()
        
        query = select(
            func.min(BackedUpPost.original_date),
            func.max(BackedUpPost.original_date)
        ).where(BackedUpPost.channel_id == channel_id)
        result = await self.db.execute(query)
        dates = result.one()
        
        return {
            "channel_id": channel_id,
            "total_backed_up_posts": total_posts,
            "total_retransmissions": total_retransmissions,
            "backup_size_mb": 0.0,
            "first_post_date": dates[0],
            "last_post_date": dates[1]
        }

