"""
Cloud Storage Service - S3-compatible storage (AWS S3, Yandex Object Storage, etc.)
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple
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

logger = logging.getLogger(__name__)


class StorageService:
    """
    Unified storage service - автоматически выбирает между локальным хранилищем и S3
    """
    
    def __init__(self):
        self.use_cloud = USE_CLOUD_STORAGE and CLOUD_STORAGE_AVAILABLE
        self.local_upload_dir = Path("uploads/publications")
        self.local_upload_dir.mkdir(parents=True, exist_ok=True)
        
        if self.use_cloud:
            if not all([S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME]):
                logger.warning("Cloud storage enabled but credentials missing. Falling back to local storage.")
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
                # CDN_URL используем только если он явно указан (не пустой)
                self.cdn_url = CDN_URL if CDN_URL else None
                logger.info(f"Cloud storage initialized: {self.bucket_name} (CDN: {self.cdn_url or 'S3 direct'})")
        else:
            logger.info("Using local file storage")
    
    async def upload_file(
        self, 
        file_content: bytes, 
        filename: str,
        content_type: str = "application/octet-stream",
        generate_thumbnail: bool = False
    ) -> dict:
        """
        Загрузить файл в хранилище
        
        Returns:
            {
                "url": "https://...",
                "path": "uploads/...",
                "size": 12345,
                "thumbnail_url": "https://..." (optional)
            }
        """
        # Генерируем уникальное имя
        file_ext = Path(filename).suffix.lower()
        file_id = str(uuid.uuid4())
        unique_filename = f"{file_id}{file_ext}"
        
        size = len(file_content)
        
        # Генерация thumbnail для изображений
        thumbnail_url = None
        if generate_thumbnail and self._is_image(file_ext):
            try:
                thumbnail_url = await self._generate_and_upload_thumbnail(
                    file_content, unique_filename, content_type
                )
            except Exception as e:
                logger.warning(f"Failed to generate thumbnail: {e}")
        
        if self.use_cloud:
            return await self._upload_to_cloud(
                file_content, unique_filename, content_type, size, thumbnail_url
            )
        else:
            return await self._upload_to_local(
                file_content, unique_filename, size, thumbnail_url
            )
    
    async def _upload_to_cloud(
        self, 
        file_content: bytes, 
        filename: str, 
        content_type: str,
        size: int,
        thumbnail_url: Optional[str]
    ) -> dict:
        """Загрузка в S3-compatible storage"""
        try:
            # Путь в бucket: uploads/{filename}
            s3_key = f"uploads/{filename}"
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'  # Делаем публичным для доступа через CDN
            )
            
            # Формируем public URL
            if self.cdn_url:
                # Если есть CDN URL - используем его
                public_url = f"{self.cdn_url.rstrip('/')}/{s3_key}"
            else:
                # Иначе формируем стандартный Yandex S3 URL
                # Формат: https://storage.yandexcloud.net/{bucket}/{key}
                endpoint = S3_ENDPOINT_URL or "https://storage.yandexcloud.net"
                public_url = f"{endpoint.rstrip('/')}/{self.bucket_name}/{s3_key}"
            
            logger.info(f"File uploaded to cloud: {public_url}")
            
            return {
                "url": public_url,
                "path": s3_key,
                "size": size,
                "thumbnail_url": thumbnail_url,
                "type": self._get_file_type(Path(filename).suffix),
                "name": filename
            }
            
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            # Fallback to local storage
            return await self._upload_to_local(file_content, filename, size, thumbnail_url)
    
    async def _upload_to_local(
        self, 
        file_content: bytes, 
        filename: str,
        size: int,
        thumbnail_url: Optional[str]
    ) -> dict:
        """Загрузка в локальное хранилище"""
        file_path = self.local_upload_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        file_url = f"/uploads/publications/{filename}"
        
        logger.info(f"File uploaded locally: {file_url}")
        
        return {
            "url": file_url,
            "path": str(file_path),
            "size": size,
            "thumbnail_url": thumbnail_url,
            "type": self._get_file_type(Path(filename).suffix),
            "name": filename
        }
    
    async def _generate_and_upload_thumbnail(
        self, 
        file_content: bytes, 
        filename: str,
        content_type: str
    ) -> Optional[str]:
        """Создать и загрузить миниатюру изображения"""
        if not CLOUD_STORAGE_AVAILABLE:
            return None
        
        try:
            # Открываем изображение
            image = Image.open(BytesIO(file_content))
            
            # Конвертируем в RGB если нужно
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
                image = background
            
            # Создаём thumbnail (макс 300x300)
            image.thumbnail((300, 300), Image.Resampling.LANCZOS)
            
            # Сохраняем в буфер
            thumb_buffer = BytesIO()
            image.save(thumb_buffer, format='JPEG', quality=85, optimize=True)
            thumb_content = thumb_buffer.getvalue()
            
            # Генерируем имя для thumbnail
            thumb_filename = Path(filename).stem + "-thumb.jpg"
            
            if self.use_cloud:
                # Загружаем thumbnail в S3
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
                # Сохраняем локально
                thumb_dir = Path("uploads/thumbnails")
                thumb_dir.mkdir(parents=True, exist_ok=True)
                thumb_path = thumb_dir / thumb_filename
                
                with open(thumb_path, "wb") as f:
                    f.write(thumb_content)
                
                return f"/uploads/thumbnails/{thumb_filename}"
                
        except Exception as e:
            logger.error(f"Failed to generate thumbnail: {e}")
            return None
    
    def _is_image(self, file_ext: str) -> bool:
        """Проверить является ли файл изображением"""
        return file_ext.lower() in {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    
    def _get_file_type(self, file_ext: str) -> str:
        """Определить тип файла"""
        ext = file_ext.lower()
        if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
            return "image"
        elif ext in {".mp4", ".mov", ".avi", ".webm"}:
            return "video"
        else:
            return "document"


# Глобальный экземпляр
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Получить экземпляр storage service"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
