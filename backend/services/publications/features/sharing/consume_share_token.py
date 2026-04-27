"""Расход share-токена — помечает один раз использованным."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication
from backend.services.publications.features.sharing.get_publication_by_token import (
    is_token_invalid,
)


class ConsumeShareToken:
    """Помечает share-токен как использованный; 404 если уже использован/истёк."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, token: str) -> bool:
        publication = (await self.db.execute(
            select(Publication).where(Publication.share_token == token)
        )).scalar_one_or_none()

        if not publication or is_token_invalid(publication):
            raise HTTPException(status_code=404, detail="Invalid or expired token")

        publication.share_token_used = True
        await self.db.flush()
        return True
