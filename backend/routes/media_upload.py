"""
Роуты для загрузки медиа файлов для публикаций
"""
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List
from backend.models.auth import User
from backend.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# Папка для загрузки медиа файлов публикаций
UPLOAD_DIR = Path("uploads/publications")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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
    """Загрузить медиа файлы для публикации"""
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
        
        # Генерируем уникальное имя файла
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        # Сохраняем файл
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Определяем тип файла
        if file_ext in ALLOWED_IMAGE_EXTENSIONS:
            file_type = "image"
        elif file_ext in ALLOWED_VIDEO_EXTENSIONS:
            file_type = "video"
        else:
            file_type = "document"
        
        # Возвращаем URL для использования в публикации
        file_url = f"/uploads/publications/{filename}"
        
        uploaded_files.append({
            "url": file_url,
            "filename": filename,
            "type": file_type,
            "original_name": file.filename
        })
    
    return JSONResponse({
        "files": uploaded_files
    })
