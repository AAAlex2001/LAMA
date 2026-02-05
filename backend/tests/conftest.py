import os
import uuid
from datetime import datetime, timezone

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from backend.database import AsyncSessionLocal, init_db, close_db
from backend.main import app as fastapi_app
from backend.models.auth import User, TelegramAccount, UserRole
from backend.models.channels import ChannelGroup
from backend.models.publications import Publication, Tag, publication_channels, publication_tags
from backend.routes.auth import get_current_user


async def _create_user() -> User:
    async with AsyncSessionLocal() as session:
        user = User(
            role=UserRole.USER,
            is_active=True,
            agree_personal_data=True,
            agree_terms=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        telegram_id = os.getenv("BENCH_USER_TELEGRAM_ID")
        if telegram_id:
            account = TelegramAccount(
                user_id=user.id,
                telegram_id=int(telegram_id),
                auth_date=datetime.now(timezone.utc),
            )
            session.add(account)
            await session.commit()

        return user


async def _init_schema() -> None:
    await init_db()
    await close_db()


async def _delete_user(user_id: int) -> None:
    async with AsyncSessionLocal() as session:
        publication_ids = list(
            (await session.execute(
                select(Publication.id).where(Publication.owner_id == user_id)
            )).scalars().all()
        )
        tag_ids = list(
            (await session.execute(
                select(Tag.id).where(Tag.owner_id == user_id)
            )).scalars().all()
        )

        if publication_ids:
            await session.execute(
                delete(publication_channels).where(
                    publication_channels.c.publication_id.in_(publication_ids)
                )
            )

        if tag_ids:
            await session.execute(
                delete(publication_tags).where(
                    publication_tags.c.tag_id.in_(tag_ids)
                )
            )
        await session.execute(delete(Publication).where(Publication.owner_id == user_id))
        await session.execute(delete(Tag).where(Tag.owner_id == user_id))
        await session.execute(delete(ChannelGroup).where(ChannelGroup.owner_id == user_id))
        user = await session.get(User, user_id)
        if user:
            await session.delete(user)
            await session.commit()


@pytest.fixture(scope="session")
def app():
    anyio.run(_init_schema)
    return fastapi_app


@pytest.fixture(scope="session")
def test_user():
    user = anyio.run(_create_user)
    anyio.run(close_db)
    yield user
    anyio.run(_delete_user, user.id)
    anyio.run(close_db)


@pytest.fixture()
def client(app, test_user):
    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
