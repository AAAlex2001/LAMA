from fastapi import FastAPI
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from backend.routes.auth import router as auth_router
from backend.routes.publication_routes import router as publication_router
from backend.routes.telegram_routes import router as telegram_router
from backend.services.scheduler_service import SchedulerService

load_dotenv()

scheduler_service = SchedulerService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения."""
    scheduler_service.start()
    yield
    scheduler_service.stop()


app = FastAPI(title="LAMA API", lifespan=lifespan)


app.include_router(auth_router)
app.include_router(publication_router)
app.include_router(telegram_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


