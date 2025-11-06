from __future__ import annotations
import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.models.publications import init_db, get_session, SessionLocal
from app.routes.publications import router as publications_router
from app.services.publications import TelegramClient, scheduler_loop

load_dotenv()

app = FastAPI(title="Telegram Publications Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(publications_router)

stop_event = asyncio.Event()
tg_client: TelegramClient | None = None
scheduler_task: asyncio.Task | None = None


@app.on_event("startup")
async def on_startup():
    global tg_client, scheduler_task
    await init_db()
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    tg_client = TelegramClient(token)
    scheduler_task = asyncio.create_task(scheduler_loop(SessionLocal, tg_client, stop_event))


@app.on_event("shutdown")
async def on_shutdown():
    global tg_client, scheduler_task
    stop_event.set()
    if scheduler_task:
        try:
            await asyncio.wait_for(scheduler_task, timeout=5)
        except asyncio.TimeoutError:
            scheduler_task.cancel()
    if tg_client:
        await tg_client.close()
