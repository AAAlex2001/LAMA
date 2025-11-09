from typing import AsyncGenerator
import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.models.base import Base
from backend.models.publications import Publication, Tag, PublicationSeries, TelegramMessage, PublicationNotification
from backend.models.channels import ChannelGroup, BackedUpPost, PostRetransmission, BackupJob
from backend.models.bots import Bot, BotMessage, BotCommand


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/publications_db")

engine = create_async_engine(
    DATABASE_URL, 
    echo=True, 
    pool_pre_ping=True, 
    pool_size=50,  # Base pool size
    max_overflow=100,  # Additional connections under load
    pool_timeout=30,  # Wait up to 30s for connection
    pool_recycle=3600  # Recycle connections after 1 hour
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    await engine.dispose()

