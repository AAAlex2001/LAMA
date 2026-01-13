"""
Роуты для загрузки медиа файлов для публикаций
"""
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List

from backend.services.storage import get_storage_service

router = APIRouter()

# Разрешенные форматы
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".zip", ".rar"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload-media")
async def upload_media(
    files: List[UploadFile] = File(...),
):
    """Загрузить медиа файлы для публикации (с поддержкой облачного хранилища)"""
    storage = get_storage_service()
    uploaded_files = []
    
    for file in files:
        # Проверяем расширение
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Неподдерживаемый формат файла {file.filename}. Разрешены: изображения, видео, документы"
            )
        
        # Проверяем размер
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"Файл {file.filename} слишком большой (макс. 50MB)"
            )
        
        # Определяем content type
        content_type = file.content_type or "application/octet-stream"
        
        # Загружаем в хранилище (локальное или облачное)
        # Для изображений генерируем thumbnail
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
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Не удалось загрузить файл {file.filename}: {str(e)}"
            )
    
    return JSONResponse({
        "success": True,
        "data": uploaded_files
    })
