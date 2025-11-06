"""
main.py — точка входа FastAPI. Единый DI: один TelegramService, один SchedulerService.
Планировщик не создает зависимости сам; все сервисы кладем в app.state для роутов.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from dotenv import load_dotenv

from backend.db import engine, SessionLocal
from backend.models.db_models import Base

from backend.services.websocket_service import WebSocketManager
from backend.services.bot_service import BotService
from backend.services.channel_service import ChannelService
from backend.services.publication_service import PublicationService
from backend.services.scheduler_service import SchedulerService
from backend.services.telegram_service import TelegramService
from backend.services.auth_service import AuthService, AuthConfig

# импортируйте ваши роутеры
from backend.routes.auth import router as auth_router
from backend.routes.publication_routes import router as publication_router
from backend.routes.telegram_routes import router as telegram_router
from backend.routes.bots import router as bots_router
from backend.routes.inbox import router as inbox_router
from backend.routes.channels import router as channels_router

load_dotenv()


# ---- сборка DI ----
ws_manager = WebSocketManager()
publication_service = PublicationService(session_factory=SessionLocal)

# создаем "сырой" bot_service (ему нужен scheduler для некоторых операций)
# поэтому scheduler соберем сразу после telegram_service
bot_service = BotService(ws_manager=ws_manager, scheduler=None, session_factory=SessionLocal)
channel_service = ChannelService(bot_service=bot_service, session_factory=SessionLocal)

telegram_service = TelegramService(
    bot_service=bot_service,
    channel_service=channel_service,
)

scheduler_service = SchedulerService(
    bot_service=bot_service,
    telegram_service=telegram_service,
    publication_service=publication_service,
    channel_service=channel_service,
)

# теперь можно замкнуть ссылку планировщика в bot_service, если он её использует
bot_service.scheduler = scheduler_service

auth_service = AuthService(session_factory=SessionLocal, config=AuthConfig())


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    scheduler_service.start()
    scheduler_service.schedule_channels_auto_sync(interval_minutes=10)
    yield
    scheduler_service.stop()


app = FastAPI(title="LAMA API", lifespan=lifespan)

# роуты
app.include_router(auth_router)
app.include_router(publication_router)
app.include_router(telegram_router)
app.include_router(bots_router)
app.include_router(inbox_router)
app.include_router(channels_router)

# app.state — один источник правды для DI в роутерах
app.state.ws_manager = ws_manager
app.state.bot_service = bot_service
app.state.channel_service = channel_service
app.state.publication_service = publication_service
app.state.scheduler_service = scheduler_service
app.state.telegram_service = telegram_service
app.state.db_engine = engine
app.state.db_sessionmaker = SessionLocal


@app.get("/health")
async def health():
    return {"status": "ok"}
