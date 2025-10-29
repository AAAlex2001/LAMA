from fastapi import FastAPI
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from backend.routes.auth import router as auth_router
from backend.routes.publication_routes import router as publication_router
from backend.routes.telegram_routes import router as telegram_router
from backend.routes.bots import router as bots_router
from backend.services.scheduler_service import SchedulerService
from backend.services.websocket_service import WebSocketManager
from backend.services.bot_service import BotService

load_dotenv()

# Shared services singletons
ws_manager = WebSocketManager()
bot_service = BotService(ws_manager=ws_manager)
scheduler_service = SchedulerService(bot_service=bot_service)


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
app.include_router(bots_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

# Expose shared services to app.state for dependency access
app.state.ws_manager = ws_manager
app.state.bot_service = bot_service
app.state.scheduler_service = scheduler_service

