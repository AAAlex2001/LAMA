import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.models.base import Base


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost:5432/publications_db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_timeout=60,
    pool_recycle=1800,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

celery_state = {"factory": None, "engine": None}


def CelerySessionLocal() -> AsyncSession:
    if celery_state["factory"] is None:
        celery_engine = create_async_engine(
            DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
            pool_timeout=60,
            pool_recycle=1800,
        )
        celery_state["engine"] = celery_engine
        celery_state["factory"] = async_sessionmaker(
            celery_engine, class_=AsyncSession, expire_on_commit=False
        )
    return celery_state["factory"]()


async def dispose_celery_engine():
    """Закрыть Celery DB engine и сбросить фабрику."""
    if celery_state["engine"] is not None:
        await celery_state["engine"].dispose()
    celery_state["engine"] = None
    celery_state["factory"] = None


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with session_scope() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    await engine.dispose()
