from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.config import OPENAI_API_KEY
from backend.services.publications.publication_service import PublicationService
from backend.services.publications.publication_create_service import PublicationCreateService
from backend.services.publications.publication_query_service import PublicationQueryService
from backend.services.publications.template_service import TemplateService
from backend.services.publications.sharing_service import SharingService
from backend.services.publications.ai_service import AIService
from backend.services.publications.series_service import SeriesService
from backend.services.publications.tag_service import TagService


async def get_tag_service(db: AsyncSession = Depends(get_db)) -> TagService:
    return TagService(db)

async def get_publication_service(db: AsyncSession = Depends(get_db)) -> PublicationService:
    return PublicationService(db=db, openai_api_key=OPENAI_API_KEY)


async def get_create_service(db: AsyncSession = Depends(get_db)) -> PublicationCreateService:
    return PublicationCreateService(db)


async def get_query_service(db: AsyncSession = Depends(get_db)) -> PublicationQueryService:
    return PublicationQueryService(db)


async def get_template_service(db: AsyncSession = Depends(get_db)) -> TemplateService:
    return TemplateService(db)


async def get_sharing_service(db: AsyncSession = Depends(get_db)) -> SharingService:
    return SharingService(db)


async def get_ai_service() -> AIService:
    return AIService(api_key=OPENAI_API_KEY)


async def get_series_service(db: AsyncSession = Depends(get_db)) -> SeriesService:
    return SeriesService(db)
