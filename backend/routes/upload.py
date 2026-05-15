"""Роут загрузки картинок для лендинга. Доступен только admin."""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from backend.routes.auth import get_current_admin

router = APIRouter(dependencies=[Depends(get_current_admin)])

# Папка для загрузки файлов
UPLOAD_DIR = Path("uploads/landing")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Разрешенные форматы
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post(
    "/upload-image",
    summary="Загрузка картинки для лендинга",
    description=(
        "Принимает один файл-картинку, сохраняет на диск в `uploads/landing/` под UUID-именем "
        "и возвращает URL для использования в landing-контенте. "
        "Лимит — 5 MB. Форматы: png/jpg/jpeg/svg/webp/gif. "
        "Только admin (через `Depends(get_current_admin)`)."
    ),
)
async def upload_image(file: UploadFile = File(...)):

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат: {file_ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс 5MB)")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/landing/{filename}"

    return JSONResponse({
        "url": file_url,
        "filename": filename
    })
