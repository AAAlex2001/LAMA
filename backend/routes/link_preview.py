from fastapi import APIRouter, Depends, Query
import logging

from backend.services.link_preview import get_link_preview
from backend.schemas.link_preview import LinkPreview
from backend.models.auth import User
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/link-preview", tags=["link-preview"])
logger = logging.getLogger(__name__)


@router.get(
    "",
    response_model=LinkPreview,
    summary="OpenGraph-превью ссылки",
    description=(
        "Запрашивает URL через aiohttp, парсит OpenGraph / `<title>` / `<meta description>` "
        "и возвращает превью. Используется в редакторе публикации при вставке URL. "
        "Требует аутентификации."
    ),
)
async def fetch_link_preview(
    url: str = Query(..., description="URL для получения превью"),
    current_user: User = Depends(get_current_user)
):
    preview = await get_link_preview(url)
    return preview
