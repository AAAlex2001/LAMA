from fastapi import APIRouter, Depends

from backend.schemas.publications.publication_response import PublicationResponse
from backend.services.publications.sharing_service import SharingService
from backend.routes.publications.dependencies import get_sharing_service
from backend.routes.auth import get_current_user
from backend.models.auth import User

router = APIRouter()


@router.post("/{publication_id}/share", response_model=dict)
async def generate_share_link(
    publication_id: int,
    service: SharingService = Depends(get_sharing_service),
    current_user: User = Depends(get_current_user),
):
    token = await service.generate_share_token(publication_id, owner_id=current_user.id)
    return {"share_token": token}


@router.get("/shared/{token}", response_model=PublicationResponse)
async def get_shared_publication(
    token: str,
    service: SharingService = Depends(get_sharing_service),
):
    return await service.get_publication_by_share_token(token)


@router.post("/shared/{token}/consume", response_model=dict)
async def consume_shared_publication_token(
    token: str,
    service: SharingService = Depends(get_sharing_service),
):
    await service.consume_share_token(token)
    return {"success": True}
