from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List
import asyncio

from backend.services.storage import get_storage_service
from backend.services.publications.media_warmup import warmup_media_files
from backend.config import get_bot

router = APIRouter()

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".zip", ".rar"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

MAX_FILE_SIZE = 50 * 1024 * 1024


@router.post("/upload-media")
async def upload_media(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
):
    """Загрузить медиа файлы для публикации (с поддержкой облачного хранилища и прогревом в Telegram)"""
    storage = get_storage_service()
    uploaded_files = []
    media_urls = []
    
    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Файл должен иметь имя")

        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Неподдерживаемый формат файла {file.filename}. Разрешены: изображения, видео, документы"
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Файл {file.filename} слишком большой (макс. 50MB)"
            )

        content_type = file.content_type or "application/octet-stream"
        generate_thumbnail = file_ext in ALLOWED_IMAGE_EXTENSIONS

        try:
            result = await storage.upload_file(
                file_content=contents,
                filename=file.filename,
                content_type=content_type,
                generate_thumbnail=generate_thumbnail
            )
            
            uploaded_files.append({
                "url": result["url"],
                "thumbnailUrl": result.get("thumbnail_url"),
                "name": file.filename,
                "path": result["path"],
                "size": result["size"],
                "type": result["type"]
            })
            
            media_urls.append(result["url"])
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Не удалось загрузить файл {file.filename}: {str(e)}"
            )
    
    file_ids = [None] * len(media_urls)
    
    if media_urls:
        try:
            bot = get_bot()
            if background_tasks:
                background_tasks.add_task(
                    warmup_media_files,
                    bot.bot,
                    media_urls
                )
        except Exception as e:
            import logging
            logging.error(f"Failed to schedule media warmup: {e}")
    
    return JSONResponse({
        "success": True,
        "data": uploaded_files,
        "file_ids": file_ids
    })
