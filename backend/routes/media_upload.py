from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List
import asyncio
import logging

from backend.services.storage import get_storage_service
from backend.services.publications.media_warmup import warmup_media_files
from backend.services.bot_provider import resolve_master

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".zip", ".rar"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

MAX_FILE_SIZE = 50 * 1024 * 1024
TOTAL_MAX_SIZE = 50 * 1024 * 1024  # Общий размер всех файлов не более 50MB


@router.post("/upload-media")
async def upload_media(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
):
    """Загрузить медиа файлы для публикации (с поддержкой облачного хранилища и прогревом в Telegram)"""
    storage = get_storage_service()
    uploaded_files = []
    media_urls = []
    
    # Читаем все файлы и проверяем общий размер
    files_data = []
    total_size = 0
    
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
        file_size = len(contents)
        total_size += file_size
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Файл {file.filename} слишком большой (макс. 50MB)"
            )
        
        files_data.append({
            'filename': file.filename,
            'contents': contents,
            'size': file_size,
            'content_type': file.content_type or "application/octet-stream",
            'file_ext': file_ext
        })
    
    # Проверяем общий размер всех файлов
    if total_size > TOTAL_MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Общий размер файлов превышает лимит ({total_size / (1024*1024):.1f}MB из 50MB)"
        )
    
    # Загружаем файлы
    for file_data in files_data:
        content_type = file_data['content_type']
        generate_thumbnail = file_data['file_ext'] in ALLOWED_IMAGE_EXTENSIONS or file_data['file_ext'] in ALLOWED_VIDEO_EXTENSIONS

        try:
            result = await storage.upload_file(
                file_content=file_data['contents'],
                filename=file_data['filename'],
                content_type=content_type,
                generate_thumbnail=generate_thumbnail
            )
            
            logger.info(f"Upload result for {file_data['filename']}: url={result.get('url')}, thumbnail_url={result.get('thumbnail_url')}")
            
            uploaded_files.append({
                "url": result["url"],
                "thumbnailUrl": result.get("thumbnail_url"),
                "name": file_data['filename'],
                "path": result["path"],
                "size": result["size"],
                "type": result["type"]
            })
            
            media_urls.append(result["url"])
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Не удалось загрузить файл {file_data['filename']}: {str(e)}"
            )
    
    file_ids = [None] * len(media_urls)
    thumbnail_urls = [f.get("thumbnailUrl") for f in uploaded_files]
    
    logger.info(f"Final response: {len(uploaded_files)} files, thumbnail_urls={thumbnail_urls}")
    
    if media_urls:
        try:
            bot = resolve_master()
            file_ids = await warmup_media_files(bot.bot, media_urls)
        except Exception as e:
            import logging
            logging.error(f"Failed to warmup media: {e}")
            file_ids = [None] * len(media_urls)
    
    return JSONResponse({
        "success": True,
        "files": uploaded_files,
        "file_ids": file_ids,
        "thumbnail_urls": thumbnail_urls
    })
