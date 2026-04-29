"""Скачивание и ресайз медиа для warmup."""

import io
import logging
from typing import Tuple
from urllib.parse import urlparse

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

MAX_IMAGE_DIMENSION = 8000
MAX_IMAGE_PIXELS = 10_000_000


async def download_media(url: str) -> Tuple[bytes, str]:
    """Скачивает файл по URL; для /uploads/* читает локально."""
    if url.startswith("/uploads/"):
        return open("/app" + url, "rb").read(), url.split("/")[-1]

    parsed = urlparse(url)
    filename = parsed.path.split("/")[-1] or "media"

    timeout = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        try:
            response = await client.get(url)
        except Exception:
            logger.exception("Download failed: %s", url)
            raise

    if response.status_code >= 400:
        logger.error("Download bad status %s: %s", response.status_code, url)
        raise RuntimeError(f"Download failed with status {response.status_code}")

    logger.info(
        "Downloaded: %s (%s bytes, %s)",
        url, len(response.content), response.headers.get("content-type"),
    )
    return response.content, filename


def resize_image_if_needed(file_bytes: bytes, filename: str) -> bytes:
    """Сжимает картинку если превышены лимиты Telegram."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        total_pixels = width * height

        needs_resize = (
            width > MAX_IMAGE_DIMENSION
            or height > MAX_IMAGE_DIMENSION
            or total_pixels > MAX_IMAGE_PIXELS
        )
        if not needs_resize:
            return file_bytes

        scale = compute_scale(width, height, total_pixels)
        new_size = (int(width * scale), int(height * scale))
        logger.info("Resizing %s: %sx%s -> %sx%s", filename, width, height, *new_size)

        img_resized = img.resize(new_size, Image.Resampling.LANCZOS)
        return encode_image(img_resized, img.format or "JPEG")

    except Exception:
        logger.exception("Resize failed for %s, using original", filename)
        return file_bytes


def compute_scale(width: int, height: int, total_pixels: int) -> float:
    """Минимальный масштаб, удовлетворяющий обоим ограничениям TG."""
    by_dimension = MAX_IMAGE_DIMENSION / max(width, height) if max(width, height) > MAX_IMAGE_DIMENSION else 1.0
    by_pixels = (MAX_IMAGE_PIXELS / total_pixels) ** 0.5 if total_pixels > MAX_IMAGE_PIXELS else 1.0
    return min(by_dimension, by_pixels)


def encode_image(img: Image.Image, fmt: str) -> bytes:
    """Кодирует Image в bytes; для не-JPEG/PNG конвертирует в JPEG."""
    output = io.BytesIO()
    if fmt == "JPEG":
        img.save(output, format="JPEG", quality=90, optimize=True)
    elif fmt == "PNG":
        img.save(output, format="PNG", optimize=True)
    else:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        img.save(output, format="JPEG", quality=90, optimize=True)
    return output.getvalue()
