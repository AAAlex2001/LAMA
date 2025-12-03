from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from backend.database import init_db, close_db
from backend.config import close_bot
from backend.scheduler import start_scheduler, stop_scheduler, scheduler
from backend.routes.publications import router as publications_router
from backend.routes.channels import router as channels_router
from backend.routes.bots import router as bots_router
from backend.routes.auth import router as auth_router
from backend.routes.webhook import router as webhook_router
from backend.routes.landing import router as landing_router
from backend.routes.upload import router as upload_router
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
app.include_router(webhook_router)  # /telegram/webhook
app.include_router(landing_router, prefix=api_prefix)  # /api/hero
app.include_router(upload_router, prefix=api_prefix)  # /api/upload-image

# Статические файлы (загруженные картинки)
upload_dir = Path("uploads/landing")
upload_dir.mkdir(parents=True, exist_ok=True)
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
    return {
        "status": "healthy",
        "database": "connected",
        "scheduler": "running" if scheduler.running else "stopped"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

