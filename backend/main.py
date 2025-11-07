from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, init_db, close_db
from backend.config import bot, OPENAI_API_KEY, close_bot
from backend.scheduler import start_scheduler, stop_scheduler, scheduler
from backend.routes.publications import router as publications_router, get_publication_service
from backend.routes.channels import router as channels_router
from backend.services.publications import PublicationService


async def get_service(db: AsyncSession = Depends(get_db)) -> PublicationService:
    return PublicationService(db=db, bot=bot, openai_api_key=OPENAI_API_KEY)


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


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.dependency_overrides[get_publication_service] = get_service


app.include_router(publications_router)
app.include_router(channels_router)


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

