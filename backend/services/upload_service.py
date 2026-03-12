from typing import List, Dict, Any
from fastapi import HTTPException, UploadFile
from pathlib import Path

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.pdf', '.doc', '.docx'}
MAX_FILE_SIZE = 50 * 1024 * 1024
TOTAL_MAX_SIZE = 50 * 1024 * 1024

def validate_media_files(files: List[UploadFile]):
    total_size = 0
    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Файл должен иметь имя")
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат: {file.filename}")
        total_size += file.size if file.size else 0
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Файл {file.filename} слишком большой")
    if total_size > TOTAL_MAX_SIZE:
        raise HTTPException(status_code=400, detail="Общий размер файлов превышает лимит")
