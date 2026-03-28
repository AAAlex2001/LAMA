import secrets
from typing import List

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.channels import ChannelGroup, InformationalMessage
from backend.schemas.channels.info_messages import InfoMessageCreate, InfoMessageUpdate
from backend.services.channel.utils.query_utils import get_channel


class InfoMessagesService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_messages(self, channel_id: int, owner_id: int) -> dict:
        channel = await get_channel(self.db, channel_id, owner_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        result = await self.db.execute(
            select(InformationalMessage)
            .where(InformationalMessage.channel_id == channel_id)
            .order_by(InformationalMessage.created_at.desc())
        )
        messages = list(result.scalars().all())
        return {
            "enabled": channel.info_messages_enabled,
            "items": messages,
        }

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
        if data.inline_keyboard is not None:
            msg.inline_keyboard = data.inline_keyboard

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
