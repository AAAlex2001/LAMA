"""Преобразование TG file_id в прямой URL файла через Bot API."""

import logging
from typing import Optional

from fastapi import HTTPException

from backend.services.bot_provider import resolve_by_token

logger = logging.getLogger(__name__)


async def resolve_media_url(bot_token: str, media_file_id: Optional[str]) -> Optional[str]:
    """Возвращает api.telegram.org/file/bot.../<path>; None если file_id не задан."""
    if not media_file_id:
        return None

    try:
        client = resolve_by_token(bot_token)
        tg_file = await client.get_file(media_file_id)
        if not tg_file.file_path:
            raise HTTPException(status_code=404, detail="Media file not found")
        return f"https://api.telegram.org/file/bot{bot_token}/{tg_file.file_path}"
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error resolving media URL for file_id=%s: %s", media_file_id, exc, exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to resolve media file")
