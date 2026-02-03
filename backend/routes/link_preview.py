from fastapi import APIRouter, HTTPException, Depends, Query
import logging

from backend.services.link_preview import get_link_preview
from backend.schemas.link_preview import LinkPreview
from backend.models.auth import User
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/link-preview", tags=["link-preview"])
logger = logging.getLogger(__name__)


@router.get("", response_model=LinkPreview)
async def fetch_link_preview(
    url: str = Query(..., description="URL для получения превью"),
    current_user: User = Depends(get_current_user)
):
    """Получить метаданные ссылки"""
    try:
        preview = await get_link_preview(url)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting link preview: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch link preview")
