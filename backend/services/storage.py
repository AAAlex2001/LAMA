import uuid
import logging
from pathlib import Path
from typing import Optional
from io import BytesIO

try:
    import boto3
    from botocore.exceptions import ClientError
    from PIL import Image
    CLOUD_STORAGE_AVAILABLE = True
except ImportError:
    CLOUD_STORAGE_AVAILABLE = False

from backend.config import (
    USE_CLOUD_STORAGE, S3_ENDPOINT_URL, S3_ACCESS_KEY,
    S3_SECRET_KEY, S3_BUCKET_NAME, S3_REGION, CDN_URL
)
from backend.schemas.common import UploadResult

logger = logging.getLogger(__name__)


class StorageService:

    def __init__(self):
        self.use_cloud = USE_CLOUD_STORAGE and CLOUD_STORAGE_AVAILABLE
        self.local_upload_dir = Path("uploads/publications")
        self.local_upload_dir.mkdir(parents=True, exist_ok=True)

        if self.use_cloud:
            if not all([S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME]):
                logger.warning(
                    "Cloud storage enabled but credentials missing. Falling back to local storage.")
                self.use_cloud = False
            else:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=S3_ENDPOINT_URL or None,
                    aws_access_key_id=S3_ACCESS_KEY,
                    aws_secret_access_key=S3_SECRET_KEY,
                    region_name=S3_REGION
                )
                self.bucket_name = S3_BUCKET_NAME
                self.cdn_url = CDN_URL if CDN_URL else None
                logger.info(
                    "Cloud storage initialized: %s (CDN: %s)", self.bucket_name, self.cdn_url or "S3 direct")
        else:
            logger.info("Using local file storage")

    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        generate_thumbnail: bool = False
    ) -> UploadResult:
        """
        Загрузить файл в хранилище

        Returns:
            UploadResult with url, path, size, thumbnail_url, type, name
        """
        file_ext = Path(filename).suffix.lower()
        file_id = str(uuid.uuid4())
        unique_filename = f"{file_id}{file_ext}"
        size = len(file_content)
        thumbnail_url = None

        logger.info("Upload file: %s, ext=%s, generate_thumbnail=%s", filename, file_ext, generate_thumbnail)

        if generate_thumbnail:
            try:
                if self.is_image(file_ext):
                    logger.info("Generating image thumbnail for %s", filename)
                    thumbnail_url = await self.generate_and_upload_thumbnail(
                        file_content, unique_filename, content_type
                    )
                    logger.info("Image thumbnail result: %s", thumbnail_url)
                elif self.is_video(file_ext):
                    logger.info("Generating video thumbnail for %s", filename)
                    thumbnail_url = await self.generate_video_thumbnail(
                        file_content, unique_filename
                    )
                    logger.info("Video thumbnail result: %s", thumbnail_url)
            except Exception as e:
                logger.warning("Failed to generate thumbnail: %s", e)

        if self.use_cloud:
            return await self._upload_to_cloud(
                file_content, unique_filename, content_type, size, thumbnail_url
            )
        else:
            return await self.upload_to_local(
                file_content, unique_filename, size, thumbnail_url
            )

    async def _upload_to_cloud(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        size: int,
        thumbnail_url: Optional[str]
    ) -> UploadResult:
        """Загрузка в S3-compatible storage"""
        try:
            s3_key = f"uploads/{filename}"
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'
            )

            if self.cdn_url:
                public_url = f"{self.cdn_url.rstrip('/')}/{s3_key}"
            else:
                endpoint = S3_ENDPOINT_URL or "https://storage.yandexcloud.net"
                public_url = f"{endpoint.rstrip('/')}/{self.bucket_name}/{s3_key}"

            logger.info("File uploaded to cloud: %s", public_url)

            return UploadResult(
                url=public_url,
                path=s3_key,
                size=size,
                thumbnail_url=thumbnail_url,
                type=self.get_file_type(Path(filename).suffix),
                name=filename,
            )

        except ClientError as e:
            logger.error("Failed to upload to S3: %s", e)
            return await self.upload_to_local(file_content, filename, size, thumbnail_url)

    async def upload_to_local(
        self,
        file_content: bytes,
        filename: str,
        size: int,
        thumbnail_url: Optional[str]
    ) -> UploadResult:
        """Загрузка в локальное хранилище"""
        file_path = self.local_upload_dir / filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        file_url = f"/uploads/publications/{filename}"

        logger.info("File uploaded locally: %s", file_url)

        return UploadResult(
            url=file_url,
            path=str(file_path),
            size=size,
            thumbnail_url=thumbnail_url,
            type=self.get_file_type(Path(filename).suffix),
            name=filename,
        )

    async def generate_and_upload_thumbnail(
        self,
        file_content: bytes,
        filename: str,
        content_type: str
    ) -> Optional[str]:
        """Создать и загрузить миниатюру изображения"""
        if not CLOUD_STORAGE_AVAILABLE:
            return None

        try:
            image = Image.open(BytesIO(file_content))
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()
                                 [-1] if image.mode in ('RGBA', 'LA') else None)
                image = background

            image.thumbnail((150, 150), Image.Resampling.LANCZOS)
            thumb_buffer = BytesIO()
            image.save(thumb_buffer, format='JPEG', quality=85, optimize=True)
            thumb_content = thumb_buffer.getvalue()
            thumb_filename = Path(filename).stem + "-thumb.jpg"

            if self.use_cloud:
                s3_key = f"thumbnails/{thumb_filename}"

                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=thumb_content,
                    ContentType='image/jpeg',
                    ACL='public-read'
                )

                if self.cdn_url:
                    thumb_url = f"{self.cdn_url.rstrip('/')}/{s3_key}"
                else:
                    endpoint = S3_ENDPOINT_URL or "https://storage.yandexcloud.net"
                    thumb_url = f"{endpoint.rstrip('/')}/{self.bucket_name}/{s3_key}"

                return thumb_url
            else:
                thumb_dir = Path("uploads/thumbnails")
                thumb_dir.mkdir(parents=True, exist_ok=True)
                thumb_path = thumb_dir / thumb_filename

                with open(thumb_path, "wb") as f:
                    f.write(thumb_content)

                return f"/uploads/thumbnails/{thumb_filename}"

        except Exception as e:
            logger.error("Failed to generate thumbnail: %s", e)
            return None

    def is_image(self, file_ext: str) -> bool:
        """Проверить является ли файл изображением"""
        return file_ext.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}

    def is_video(self, file_ext: str) -> bool:
        """Проверить является ли файл видео"""
        return file_ext.lower() in {".mp4", ".mov", ".avi", ".webm"}

    async def generate_video_thumbnail(
        self,
        file_content: bytes,
        filename: str
    ) -> Optional[str]:
        """Создать и загрузить миниатюру первого кадра видео"""
        import tempfile
        import asyncio

        try:
            # Сохраняем видео во временный файл
            with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp_video:
                tmp_video.write(file_content)
                tmp_video_path = tmp_video.name

            # Путь для thumbnail
            thumb_filename = Path(filename).stem + "-thumb.jpg"
            tmp_thumb_path = tempfile.mktemp(suffix=".jpg")

            # Извлекаем первый кадр через ffmpeg
            cmd = [
                "ffmpeg", "-y", "-i", tmp_video_path,
                "-vf", "scale=150:150:force_original_aspect_ratio=increase,crop=150:150",
                "-frames:v", "1",
                "-q:v", "2",
                tmp_thumb_path
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await process.wait()

            # Удаляем временное видео
            Path(tmp_video_path).unlink(missing_ok=True)

            if not Path(tmp_thumb_path).exists():
                logger.warning("ffmpeg failed to create thumbnail for %s", filename)
                return None

            # Читаем thumbnail
            with open(tmp_thumb_path, "rb") as f:
                thumb_content = f.read()
            Path(tmp_thumb_path).unlink(missing_ok=True)

            # Загружаем thumbnail
            if self.use_cloud:
                s3_key = f"thumbnails/{thumb_filename}"
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=thumb_content,
                    ContentType='image/jpeg',
                    ACL='public-read'
                )

                if self.cdn_url:
                    return f"{self.cdn_url.rstrip('/')}/{s3_key}"
                endpoint = S3_ENDPOINT_URL or "https://storage.yandexcloud.net"
                return f"{endpoint.rstrip('/')}/{self.bucket_name}/{s3_key}"
            else:
                thumb_dir = Path("uploads/thumbnails")
                thumb_dir.mkdir(parents=True, exist_ok=True)
                thumb_path = thumb_dir / thumb_filename
                with open(thumb_path, "wb") as f:
                    f.write(thumb_content)
                return f"/uploads/thumbnails/{thumb_filename}"

        except Exception as e:
            logger.error("Failed to generate video thumbnail: %s", e)
            return None

    def get_file_type(self, file_ext: str) -> str:
        """Определить тип файла"""
        ext = file_ext.lower()
        if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
            return "image"
        elif ext in {".mp4", ".mov", ".avi", ".webm"}:
            return "video"
        else:
            return "document"


# Глобальный экземпляр
storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Получить экземпляр storage service"""
    global storage_service
    if storage_service is None:
        storage_service = StorageService()
    return storage_service
