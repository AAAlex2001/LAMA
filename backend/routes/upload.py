"""
Роуты для загрузки файлов (картинок для лендинга)
"""
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
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
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл должен иметь имя")

    # Проверяем расширение
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Проверяем размер
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 5MB)")
    
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

