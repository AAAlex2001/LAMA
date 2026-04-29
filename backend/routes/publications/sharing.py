from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth import get_current_user
from backend.schemas.publications.publications import PublicationResponse
from backend.services.publications.features.sharing.consume_share_token import ConsumeShareToken
from backend.services.publications.features.sharing.generate_share_token import GenerateShareToken
from backend.services.publications.features.sharing.get_publication_by_token import (
    GetPublicationByShareToken,
)

router = APIRouter()


@router.post("/{publication_id}/share", response_model=dict)
async def generate_share_link(
    publication_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = await GenerateShareToken(db).execute(publication_id, owner_id=current_user.id)
    return {"share_token": token}


@router.get("/shared/{token}", response_model=PublicationResponse)
async def get_shared_publication(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    return await GetPublicationByShareToken(db).execute(token)


@router.post("/shared/{token}/consume", response_model=dict)
async def consume_shared_publication_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    await ConsumeShareToken(db).execute(token)
    return {"success": True}
