from fastapi import FastAPI
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from backend.routes.auth import router as auth_router
from backend.routes.publication_routes import router as publication_router
from backend.routes.telegram_routes import router as telegram_router
from backend.routes.bots import router as bots_router
from backend.routes.inbox import router as inbox_router
from backend.routes.channels import router as channels_router
from backend.services.scheduler_service import SchedulerService
from backend.services.websocket_service import WebSocketManager
from backend.services.bot_service import BotService
from backend.services.channel_service import ChannelService
from backend.services.auth_service import AuthService, AuthConfig
from backend.db import engine, SessionLocal
from backend.models.db_models import Base

load_dotenv()

# Shared services singletons
ws_manager = WebSocketManager()
scheduler_service = SchedulerService(bot_service=None)  # Temporary
bot_service = BotService(ws_manager=ws_manager, scheduler=scheduler_service)
scheduler_service.bot_service = bot_service  # Update reference
channel_service = ChannelService(bot_service=bot_service, session_factory=SessionLocal)
scheduler_service.channel_service = channel_service
auth_service = AuthService(session_factory=SessionLocal, config=AuthConfig())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения."""
    # Create DB schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    scheduler_service.start()
    # periodic auto-sync for channels
    scheduler_service.schedule_channels_auto_sync(interval_minutes=10)
    yield
    scheduler_service.stop()


app = FastAPI(title="LAMA API", lifespan=lifespan)


app.include_router(auth_router)
app.include_router(publication_router)
app.include_router(telegram_router)
app.include_router(bots_router)
app.include_router(inbox_router)
app.include_router(channels_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

# Expose shared services to app.state for dependency access
app.state.ws_manager = ws_manager
app.state.bot_service = bot_service
app.state.scheduler_service = scheduler_service
app.state.channel_service = channel_service
app.state.auth_service = auth_service
app.state.db_engine = engine
app.state.db_sessionmaker = SessionLocal



