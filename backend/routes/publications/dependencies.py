from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.config import OPENAI_API_KEY
from backend.routes.auth import get_current_user
from backend.services.publications.publication_service import PublicationService


async def get_publication_service(
    db: AsyncSession = Depends(get_db),
) -> PublicationService:
    return PublicationService(db=db, openai_api_key=OPENAI_API_KEY)
