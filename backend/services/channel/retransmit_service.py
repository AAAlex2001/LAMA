import asyncio
from typing import Optional

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramRetryAfter
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import BackedUpPost, ChannelGroup, PostRetransmission
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.media_utils import build_media_inputs

MAX_RETRIES = 5


class RetransmitService:
    """Ретрансляция бекапнутых постов в каналы."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def retransmit_post(
        self,
        original_post: BackedUpPost,
        target_channel_id: int,
        target_channel: Optional[ChannelGroup] = None,
        bot: Optional[Bot] = None,
    ) -> PostRetransmission:
        """Ретранслировать пост в другой канал."""
        if target_channel is None:
            from backend.services.channel.channel_service import ChannelService
            service = ChannelService(self.db)
            target_channel = await service.get(target_channel_id)
            if not target_channel:
                raise ValueError("Target channel not found")

        if bot is None:
            bot = await resolve_for_channel(self.db, target_channel)

        success = True
        error_message = None
        target_message_id = 0

        try:
            sent = await self.copy_message(original_post, target_channel.telegram_id, bot)
            target_message_id = sent.message_id
        except Exception as e:
            success = False
            error_message = str(e)

        retransmission = PostRetransmission(
            original_post_id=original_post.id,
            target_channel_id=target_channel_id,
            target_message_id=target_message_id,
            success=success,
            error_message=error_message,
        )
        self.db.add(retransmission)
        await self.db.commit()
        await self.db.refresh(retransmission)
        return retransmission

    async def copy_message(self, post: BackedUpPost, target_telegram_id: int, bot: Bot) -> Message:
        """Скопировать сообщение в канал с ретраями."""
        for attempt in range(MAX_RETRIES):
            try:
                return await self.send_post(post, target_telegram_id, bot)
            except TelegramRetryAfter as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(e.retry_after)
                else:
                    raise
            except Exception:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

    async def send_post(self, post: BackedUpPost, target_telegram_id: int, bot: Bot) -> Message:
        """Отправить пост в канал."""
        if post.media_group_id and post.media_file_ids and len(post.media_file_ids) > 1:
            media_inputs = build_media_inputs(post)
            if media_inputs:
                messages = await bot.send_media_group(chat_id=target_telegram_id, media=media_inputs)
                return messages[0]

        send_methods = {
            "text": lambda: bot.send_message(
                chat_id=target_telegram_id,
                text=post.text_content or "Empty message",
                reply_markup=post.reply_markup,
            ),
            "photo": lambda: bot.send_photo(
                chat_id=target_telegram_id,
                photo=post.media_file_ids[0],
                caption=post.text_content,
                reply_markup=post.reply_markup,
                has_spoiler=post.has_spoiler,
            ),
            "video": lambda: bot.send_video(
                chat_id=target_telegram_id,
                video=post.media_file_ids[0],
                caption=post.text_content,
                reply_markup=post.reply_markup,
                has_spoiler=post.has_spoiler,
            ),
            "document": lambda: bot.send_document(
                chat_id=target_telegram_id,
                document=post.media_file_ids[0],
                caption=post.text_content,
                reply_markup=post.reply_markup,
            ),
            "audio": lambda: bot.send_audio(
                chat_id=target_telegram_id,
                audio=post.media_file_ids[0],
                caption=post.text_content,
                reply_markup=post.reply_markup,
            ),
            "sticker": lambda: bot.send_sticker(
                chat_id=target_telegram_id,
                sticker=post.media_file_ids[0],
                reply_markup=post.reply_markup,
            ),
        }

        if post.content_type in send_methods and (post.content_type == "text" or post.media_file_ids):
            return await send_methods[post.content_type]()

        return await bot.send_message(
            chat_id=target_telegram_id,
            text=post.text_content or "Unsupported content type",
        )
