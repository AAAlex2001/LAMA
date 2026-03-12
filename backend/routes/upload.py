"""
Роуты для загрузки файлов (картинок для лендинга)
"""
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File
from backend.services.upload_service import validate_media_files
from fastapi.responses import JSONResponse

router = APIRouter()

# Папка для загрузки файлов
UPLOAD_DIR = Path("uploads/landing")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Разрешенные форматы
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Загрузить картинку для лендинга"""

    # Проверяем расширение")
    
    # Генерируем уникальное имя файла
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Сохраняем файл
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Возвращаем URL для использования в админке
    # В продакшене это должен быть полный URL, например: https://lamaplanner.com/uploads/landing/...
    file_url = f"/uploads/landing/{filename}"
    
    return JSONResponse({
        "url": file_url,
        "filename": filename
    })

