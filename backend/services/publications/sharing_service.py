from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication, TelegramMessage


class SharingService:
    """Share-token operations for publications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_share_token(self, publication_id: int, owner_id: int, expires_days: int = 7) -> str:
        query = select(Publication).where(
            Publication.id == publication_id,
            Publication.owner_id == owner_id,
        )
        result = await self.db.execute(query)
        publication = result.scalar_one_or_none()
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")

        token = secrets.token_urlsafe(32)
        publication.share_token = token
        publication.share_token_expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
        publication.share_token_used = False

        await self.db.flush()
        await self.db.refresh(publication)
        return token

    async def get_publication_by_share_token(self, token: str) -> Publication:
        query = (
            select(Publication)
            .where(Publication.share_token == token)
            .options(
                selectinload(Publication.channels).selectinload(Channel.bot),
                selectinload(Publication.tags),
                selectinload(Publication.series),
                selectinload(Publication.telegram_messages)
                .selectinload(TelegramMessage.channel)
                .selectinload(Channel.bot),
            )
        )
        result = await self.db.execute(query)
        publication = result.scalar_one_or_none()

        if not publication:
            raise HTTPException(status_code=404, detail="Shared publication not found")
        if publication.share_token_expires_at and publication.share_token_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=404, detail="Shared publication not found")
        if publication.share_token_used:
            raise HTTPException(status_code=404, detail="Shared publication not found")
        return publication

    async def consume_share_token(self, token: str) -> bool:
        query = select(Publication).where(Publication.share_token == token)
        result = await self.db.execute(query)
        publication = result.scalar_one_or_none()

        if not publication:
            raise HTTPException(status_code=404, detail="Invalid or expired token")
        if publication.share_token_expires_at and publication.share_token_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=404, detail="Invalid or expired token")
        if publication.share_token_used:
            raise HTTPException(status_code=404, detail="Invalid or expired token")

        publication.share_token_used = True
        await self.db.flush()
        return True
