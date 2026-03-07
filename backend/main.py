from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from backend.database import init_db, close_db, AsyncSessionLocal
from backend.config import close_bot, TELEGRAM_BOT_TOKEN
from backend.models import load_models
from backend.routes.publications import router as publications_router
from backend.routes.channels import router as channels_router
from backend.routes.bots import router as bots_router
from backend.routes.auth import router as auth_router
from backend.routes.webhook import router as webhook_router
from backend.routes.landing import router as landing_router
from backend.routes.upload import router as upload_router
from backend.routes.media_upload import router as media_upload_router
from backend.routes.link_preview import router as link_preview_router
from backend.routes.inbox.crud import router as inbox_router
from backend.routes.direct import direct_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    await init_db()
    yield
    await close_db()
    await close_bot()


app = FastAPI(
    title="Lama API",
    description="Сервис для управления контентов в Telegram",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["content-length", "content-range"],
)


api_prefix = "/api"

app.include_router(auth_router, prefix=api_prefix)
app.include_router(publications_router, prefix=api_prefix)
app.include_router(channels_router, prefix=api_prefix)
app.include_router(bots_router, prefix=api_prefix)
app.include_router(webhook_router, prefix=api_prefix)
app.include_router(landing_router, prefix=api_prefix)
app.include_router(upload_router, prefix=api_prefix)
app.include_router(media_upload_router, prefix=api_prefix)
app.include_router(link_preview_router, prefix=api_prefix)
app.include_router(inbox_router, prefix=f"{api_prefix}/inbox", tags=["inbox"])
app.include_router(direct_router, prefix=f"{api_prefix}/direct")

upload_dir = Path("uploads/landing")
upload_dir.mkdir(parents=True, exist_ok=True)
publications_upload_dir = Path("uploads/publications")
publications_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "Lama API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка работоспособности API, БД и Redis."""
    from sqlalchemy import text

    db_status = "unknown"
    db_error = None

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as e:
        db_status = "disconnected"
        db_error = str(e)

    redis_url = os.getenv("REDIS_URL")
    redis_status = "not_configured" if not redis_url else "unknown"
    if redis_url:
        try:
            from redis.asyncio import Redis

            client = Redis.from_url(redis_url)
            await client.ping()
            await client.aclose()
            redis_status = "connected"
        except Exception as e:
            redis_status = f"disconnected: {e}"

    bot_status = "configured" if TELEGRAM_BOT_TOKEN else "not_configured"

    health_status = {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "queue": "celery",
        "redis": redis_status,
        "bot": bot_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if db_error:
        health_status["database_error"] = db_error

    return health_status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
