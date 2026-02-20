"""Скачивание и ресайз медиа файлов."""

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
    """Скачивает файл по URL."""
    parsed = urlparse(url)
    filename = parsed.path.split("/")[-1] or "media"

    timeout = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        try:
            resp = await client.get(url)
        except Exception:
            logger.exception("Download failed: %s", url)
            raise

    if resp.status_code >= 400:
        logger.error("Download bad status %s: %s", resp.status_code, url)
        raise RuntimeError(f"Download failed with status {resp.status_code}")

    logger.info("Downloaded: %s (%s bytes, %s)", url, len(resp.content), resp.headers.get("content-type"))
    return resp.content, filename


def resize_image_if_needed(file_bytes: bytes, filename: str) -> bytes:
    """Сжимает изображение если оно превышает лимиты Telegram."""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
        total_pixels = width * height

        logger.info("Checking image %s: %sx%s (%s px)", filename, width, height, total_pixels)

        needs_resize = (
            width > MAX_IMAGE_DIMENSION
            or height > MAX_IMAGE_DIMENSION
            or total_pixels > MAX_IMAGE_PIXELS
        )

        if not needs_resize:
            logger.info("Image %s within limits", filename)
            return file_bytes

        scale_by_dimension = 1.0
        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            scale_by_dimension = MAX_IMAGE_DIMENSION / max(width, height)

        scale_by_pixels = 1.0
        if total_pixels > MAX_IMAGE_PIXELS:
            scale_by_pixels = (MAX_IMAGE_PIXELS / total_pixels) ** 0.5

        scale = min(scale_by_dimension, scale_by_pixels)
        new_width = int(width * scale)
        new_height = int(height * scale)

        logger.info("Resizing %s: %sx%s -> %sx%s", filename, width, height, new_width, new_height)

        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        img_format = img.format or "JPEG"

        if img_format == "JPEG":
            img_resized.save(output, format="JPEG", quality=90, optimize=True)
        elif img_format == "PNG":
            img_resized.save(output, format="PNG", optimize=True)
        else:
            if img_resized.mode in ("RGBA", "LA", "P"):
                img_resized = img_resized.convert("RGB")
            img_resized.save(output, format="JPEG", quality=90, optimize=True)

        resized_bytes = output.getvalue()
        logger.info("Resized %s: %s -> %s bytes", filename, len(file_bytes), len(resized_bytes))
        return resized_bytes

    except Exception:
        logger.exception("Resize failed for %s, using original", filename)
        return file_bytes
