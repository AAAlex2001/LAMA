import secrets

from aiogram.enums import ParseMode
from aiogram.types import InputMediaDocument, InputMediaPhoto, InputMediaVideo
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, InformationalMessage
from backend.schemas.channels.info_messages import InfoMessageCreate, InfoMessageUpdate, InfoMessagesListResponse, AutoReplyToggle
from backend.services.bot_provider import resolve_for_channel
from backend.services.channel.utils.query_utils import get_channel
from backend.services.publications.utils.html_utils import clean_html_for_telegram
from backend.utils.keyboard import build_keyboard
from backend.utils.media import is_document_url, is_video_url


class InfoMessagesService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_messages(self, channel_id: int, owner_id: int) -> InfoMessagesListResponse:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        result = await self.db.execute(
            select(InformationalMessage)
            .where(InformationalMessage.channel_id == channel_id)
            .order_by(InformationalMessage.created_at.desc())
        )
        messages = list(result.scalars().all())
        return InfoMessagesListResponse(
            enabled=channel.info_messages_enabled,
            auto_reply_enabled=channel.auto_reply_enabled,
            items=messages,
        )

    async def toggle_auto_reply(self, channel_id: int, enabled: bool, owner_id: int) -> ChannelGroup:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        channel.auto_reply_enabled = enabled
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def toggle(self, channel_id: int, enabled: bool, owner_id: int) -> ChannelGroup:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        channel.info_messages_enabled = enabled
        await self.db.flush()
        await self.db.refresh(channel)
        return channel

    async def create_message(self, channel_id: int, data: InfoMessageCreate, owner_id: int) -> InformationalMessage:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        msg = InformationalMessage(
            channel_id=channel_id,
            text=data.text,
            media_url=data.media_url,
            media_type=data.media_type,
            media_urls=data.media_urls if data.media_urls else None,
            inline_keyboard=data.inline_keyboard,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def update_message(self, channel_id: int, message_id: int, data: InfoMessageUpdate, owner_id: int) -> InformationalMessage:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        result = await self.db.execute(
            select(InformationalMessage).where(
                InformationalMessage.id == message_id,
                InformationalMessage.channel_id == channel_id,
            )
        )
        msg = result.scalar_one_or_none()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        if data.text is not None:
            msg.text = data.text
        if data.media_url is not None:
            msg.media_url = data.media_url
        if data.media_type is not None:
            msg.media_type = data.media_type
        if data.media_urls is not None:
            msg.media_urls = data.media_urls if data.media_urls else None
        if data.inline_keyboard is not None:
            msg.inline_keyboard = data.inline_keyboard
        if data.is_enabled is not None:
            msg.is_enabled = data.is_enabled

        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def generate_share_token(self, channel_id: int, message_id: int, owner_id: int) -> str:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        result = await self.db.execute(
            select(InformationalMessage).where(
                InformationalMessage.id == message_id,
                InformationalMessage.channel_id == channel_id,
            )
        )
        msg = result.scalar_one_or_none()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        token = secrets.token_urlsafe(32)
        msg.share_token = token
        await self.db.flush()
        return token

    async def publish_message(self, channel_id: int, message_id: int, owner_id: int) -> InformationalMessage:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        if not channel.telegram_id:
            raise HTTPException(status_code=400, detail="Channel has no Telegram ID")

        result = await self.db.execute(
            select(InformationalMessage).where(
                InformationalMessage.id == message_id,
                InformationalMessage.channel_id == channel_id,
            )
        )
        msg = result.scalar_one_or_none()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        bot = await resolve_for_channel(self.db, channel)
        cleaned_text = clean_html_for_telegram(msg.text)
        keyboard = build_keyboard(msg.inline_keyboard) if msg.inline_keyboard else None
        chat_id = channel.telegram_id

        urls = [u for u in (msg.media_urls or []) if u]
        if not urls and msg.media_url:
            urls = [msg.media_url]

        if len(urls) > 1:
            media_group = []
            for i, url in enumerate(urls[:10]):
                cap = cleaned_text if i == 0 else None
                pm = ParseMode.HTML if cap else None
                if is_video_url(url):
                    media_group.append(InputMediaVideo(media=url, caption=cap, parse_mode=pm))
                elif is_document_url(url):
                    media_group.append(InputMediaDocument(media=url, caption=cap, parse_mode=pm))
                else:
                    media_group.append(InputMediaPhoto(media=url, caption=cap, parse_mode=pm))
            await bot.send_media_group(chat_id=chat_id, media=media_group)
            if keyboard:
                await bot.send_message(chat_id=chat_id, text="\u200b", reply_markup=keyboard)
            return msg

        if len(urls) == 1 and msg.media_type:
            u = urls[0]
            mt = msg.media_type.upper()
            if mt == "PHOTO":
                await bot.send_photo(
                    chat_id=chat_id,
                    photo=u,
                    caption=cleaned_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=keyboard,
                )
                return msg
            if mt == "VIDEO":
                await bot.send_video(
                    chat_id=chat_id,
                    video=u,
                    caption=cleaned_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=keyboard,
                )
                return msg
            if mt == "DOCUMENT":
                await bot.send_document(
                    chat_id=chat_id,
                    document=u,
                    caption=cleaned_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=keyboard,
                )
                return msg
            await bot.send_message(
                chat_id=chat_id,
                text=cleaned_text or "",
                parse_mode=ParseMode.HTML,
                reply_markup=keyboard,
            )
            return msg

        if cleaned_text:
            await bot.send_message(
                chat_id=chat_id,
                text=cleaned_text,
                parse_mode=ParseMode.HTML,
                reply_markup=keyboard,
            )
            return msg

        raise HTTPException(status_code=400, detail="Message has no content to publish")

    async def delete_message(self, channel_id: int, message_id: int, owner_id: int) -> None:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        result = await self.db.execute(
            select(InformationalMessage).where(
                InformationalMessage.id == message_id,
                InformationalMessage.channel_id == channel_id,
            )
        )
        msg = result.scalar_one_or_none()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        await self.db.delete(msg)
        await self.db.flush()
