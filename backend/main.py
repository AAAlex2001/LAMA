from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from datetime import datetime, timezone

# Настройка логирования для всех модулей backend
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
from backend.scheduler import start_scheduler, stop_scheduler, scheduler
from backend.routes.publications import router as publications_router
from backend.routes.channels import router as channels_router
from backend.routes.bots import router as bots_router
from backend.routes.auth import router as auth_router
from backend.routes.webhook import router as webhook_router
from backend.routes.landing import router as landing_router
from backend.routes.upload import router as upload_router
from backend.routes.media_upload import router as media_upload_router
# Импорт моделей для регистрации в SQLAlchemy
from backend.models import landing as landing_models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()
    await close_db()
    await close_bot()


app = FastAPI(
    title="Lama API",
    description="Сервис для управления контентов в Telegram",
    version="1.0.0",
    lifespan=lifespan
)


# Middleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api_prefix = "/api"

app.include_router(auth_router, prefix=api_prefix)
app.include_router(publications_router, prefix=api_prefix)
app.include_router(channels_router, prefix=api_prefix)
app.include_router(bots_router, prefix=api_prefix)
app.include_router(webhook_router)
app.include_router(landing_router, prefix=api_prefix)
app.include_router(upload_router, prefix=api_prefix)
app.include_router(media_upload_router, prefix=api_prefix)

# Статические файлы (загруженные картинки)
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
    """Health check endpoint with real database connection test"""
    from sqlalchemy import text

    db_status = "unknown"
    db_error = None

    # Проверка подключения к БД
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as e:
        db_status = "disconnected"
        db_error = str(e)

    # Проверка планировщика
    scheduler_status = "running" if scheduler.running else "stopped"

    # Проверка бота
    bot_status = "configured" if TELEGRAM_BOT_TOKEN else "not_configured"

    health_status = {
        "status": "healthy" if db_status == "connected" and scheduler_status == "running" else "unhealthy",
        "database": db_status,
        "scheduler": scheduler_status,
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
