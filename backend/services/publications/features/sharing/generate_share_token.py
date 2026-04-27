"""Создание share-токена для публикации с TTL."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication


class GenerateShareToken:
    """Генерирует одноразовый токен и записывает срок действия в публикацию."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, publication_id: int, owner_id: int, expires_days: int = 7,
    ) -> str:
        """Бросает 404 если публикация не принадлежит пользователю."""
        publication = (await self.db.execute(
            select(Publication).where(
                Publication.id == publication_id,
                Publication.owner_id == owner_id,
            )
        )).scalar_one_or_none()
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")

        token = secrets.token_urlsafe(32)
        publication.share_token = token
        publication.share_token_expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
        publication.share_token_used = False

        await self.db.flush()
        await self.db.refresh(publication)
        return token
