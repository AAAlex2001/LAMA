"""Тест DeleteTelegramMessages с замоканным callback бота."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.models.publications import (
    ContentType as DBContentType,
    Publication,
    PublicationStatus as DBPublicationStatus,
    TelegramMessage,
)
from backend.services.publications.features.publishing.delete_telegram_messages import (
    DeleteTelegramMessages,
)


def make_bot(delete_should_raise=False):
    async def delete_message(chat_id, message_id):
        if delete_should_raise:
            raise RuntimeError("api boom")
        return True

    return SimpleNamespace(delete_message=delete_message)


@pytest.mark.asyncio
async def test_marks_publication_deleted_when_all_deleted(db, test_user, test_channel):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.PUBLISHED,
        text_content="x",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)

    msg = TelegramMessage(
        publication_id=pub.id,
        channel_id=test_channel.id,
        telegram_message_id=42,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(pub, ["telegram_messages"])

    get_bot = AsyncMock(return_value=make_bot())

    result = await DeleteTelegramMessages(db).execute(pub, get_bot)
    await db.commit()
    await db.refresh(pub)

    assert result.success is True
    assert result.success_count == 1
    assert result.total_count == 1
    assert pub.status == DBPublicationStatus.DELETED


@pytest.mark.asyncio
async def test_keeps_published_when_telegram_fails(db, test_user, test_channel):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.PUBLISHED,
        text_content="x",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)

    msg = TelegramMessage(
        publication_id=pub.id,
        channel_id=test_channel.id,
        telegram_message_id=42,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(pub, ["telegram_messages"])

    get_bot = AsyncMock(return_value=make_bot(delete_should_raise=True))

    result = await DeleteTelegramMessages(db).execute(pub, get_bot)
    await db.commit()
    await db.refresh(pub)

    assert result.success is False
    assert result.success_count == 0
    assert pub.status == DBPublicationStatus.PUBLISHED


@pytest.mark.asyncio
async def test_no_messages_returns_zero_total(db, test_user):
    pub = Publication(
        owner_id=test_user.id,
        content_type=DBContentType.TEXT,
        status=DBPublicationStatus.PUBLISHED,
        text_content="x",
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub, ["telegram_messages"])

    get_bot = AsyncMock(return_value=make_bot())

    result = await DeleteTelegramMessages(db).execute(pub, get_bot)
    assert result.total_count == 0
    assert result.success_count == 0
