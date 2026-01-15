"""
Media proxy endpoint для обхода CORS при генерации превью из черновиков.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
import httpx
from urllib.parse import urlparse

router = APIRouter()


@router.get("/proxy")
async def proxy_media(url: str = Query(..., description="URL файла для проксирования")):
    """
    Проксирует медиа-файлы из Yandex Cloud Storage, добавляя CORS-заголовки.
    
    Используется для генерации превью на клиенте из черновиков,
    когда прямой fetch блокируется CORS-политикой облака.
    """
    # Безопасность: проверяем, что URL из нашего storage
    parsed = urlparse(url)
    allowed_domains = ['storage.yandexcloud.net']
    
    if not any(domain in parsed.netloc for domain in allowed_domains):
        raise HTTPException(status_code=400, detail="Invalid storage URL")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Определяем content-type
            content_type = response.headers.get('content-type', 'application/octet-stream')
            
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Cache-Control': 'public, max-age=31536000',  # Кэш на год
                }
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch media: {str(e)}")
