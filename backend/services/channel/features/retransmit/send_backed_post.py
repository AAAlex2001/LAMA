import asyncio

from aiogram.exceptions import TelegramRetryAfter
from aiogram.types import Message

from backend.models.channels import BackedUpPost
from backend.services.channel.utils.media_utils import build_media_inputs
from backend.services.telegram_client import RateLimitedBot

MAX_RETRIES = 5


async def send_backed_post(
    bot: RateLimitedBot, chat_id: int, post: BackedUpPost,
) -> Message:
    """Отправляет копию бекапнутого поста в чат с ретраями (TelegramRetryAfter не глушим)."""
    for attempt in range(MAX_RETRIES):
        try:
            return await dispatch_send(bot, chat_id, post)
        except TelegramRetryAfter:
            raise
        except Exception:
            if attempt == MAX_RETRIES - 1:
                raise
            await asyncio.sleep(2 ** attempt)


async def dispatch_send(
    bot: RateLimitedBot, chat_id: int, post: BackedUpPost,
) -> Message:
    """Отправляет пост: альбом, медиа или текст в зависимости от content_type."""
    if post.media_group_id and post.media_file_ids and len(post.media_file_ids) > 1:
        media = build_media_inputs(post)
        if media:
            messages = await bot.send_media_group(chat_id=chat_id, media=media)
            return messages[0]

    text = post.text_content
    keyboard = post.reply_markup
    file_id = post.media_file_ids[0] if post.media_file_ids else None

    if post.content_type == "text" or not file_id:
        return await bot.send_message(
            chat_id=chat_id, text=text or "Empty message", reply_markup=keyboard,
        )
    if post.content_type == "photo":
        return await bot.send_photo(
            chat_id=chat_id, photo=file_id, caption=text,
            reply_markup=keyboard, has_spoiler=post.has_spoiler,
        )
    if post.content_type == "video":
        return await bot.send_video(
            chat_id=chat_id, video=file_id, caption=text,
            reply_markup=keyboard, has_spoiler=post.has_spoiler,
        )
    if post.content_type == "document":
        return await bot.send_document(
            chat_id=chat_id, document=file_id, caption=text, reply_markup=keyboard,
        )
    if post.content_type == "audio":
        return await bot.send_audio(
            chat_id=chat_id, audio=file_id, caption=text, reply_markup=keyboard,
        )
    if post.content_type == "sticker":
        return await bot.send_sticker(
            chat_id=chat_id, sticker=file_id, reply_markup=keyboard,
        )

    return await bot.send_message(
        chat_id=chat_id, text=text or "Unsupported content type",
    )
