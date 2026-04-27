"""Получение публикации по share-токену (для гостевого просмотра)."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup as Channel
from backend.models.publications import Publication, TelegramMessage


class GetPublicationByShareToken:
    """Возвращает публикацию по токену; 404 если истёк/использован/не найден."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, token: str) -> Publication:
        publication = (await self.db.execute(
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
        )).scalar_one_or_none()

        if not publication or is_token_invalid(publication):
            raise HTTPException(status_code=404, detail="Shared publication not found")
        return publication


def is_token_invalid(publication: Publication) -> bool:
    """True если токен использован или истёк."""
    if publication.share_token_used:
        return True
    expires = publication.share_token_expires_at
    return bool(expires and expires < datetime.now(timezone.utc))
