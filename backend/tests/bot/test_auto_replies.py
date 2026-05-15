"""Тесты auto-replies: CRUD + поиск по тексту + frequency check."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from backend.models.bots import AutoReply, AutoReplyLog
from backend.schemas.bots.auto_replies import AutoReplyCreate, AutoReplyUpdate
from backend.services.bot.features.auto_replies.create_auto_reply import CreateAutoReply
from backend.services.bot.features.auto_replies.delete_auto_reply import DeleteAutoReply
from backend.services.bot.features.auto_replies.find_by_text import FindAutoReplyByText
from backend.services.bot.features.auto_replies.frequency_check import is_allowed_by_frequency
from backend.services.bot.features.auto_replies.list_auto_replies import ListAutoReplies
from backend.services.bot.features.auto_replies.lookup import find_auto_reply_or_404
from backend.services.bot.features.auto_replies.update_auto_reply import UpdateAutoReply


@pytest.mark.asyncio
async def test_create_auto_reply(db, test_user, test_bot):
    payload = AutoReplyCreate(
        keywords=["привет", "hello"],
        response_text="Здравствуйте!",
    )
    reply = await CreateAutoReply(db).execute(
        test_bot.id, payload, owner_id=test_user.id,
    )
    await db.commit()
    assert reply.id is not None
    assert reply.keywords == ["привет", "hello"]
    assert reply.response_text == "Здравствуйте!"


@pytest.mark.asyncio
async def test_create_404_for_foreign(db, test_user):
    payload = AutoReplyCreate(keywords=["x"], response_text="y")
    with pytest.raises(HTTPException) as exc:
        await CreateAutoReply(db).execute(99999, payload, owner_id=test_user.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_list_returns_paginated(db, test_user, test_bot):
    for n in range(5):
        await CreateAutoReply(db).execute(
            test_bot.id,
            AutoReplyCreate(keywords=[f"k{n}"], response_text=f"r{n}"),
            owner_id=test_user.id,
        )
    await db.commit()

    items, total = await ListAutoReplies(db).execute(
        test_bot.id, None, owner_id=test_user.id, skip=0, limit=3,
    )
    assert total == 5
    assert len(items) == 3


@pytest.mark.asyncio
async def test_update_partial(db, test_user, test_bot):
    reply = await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(keywords=["old"], response_text="old"),
        owner_id=test_user.id,
    )
    await db.commit()

    updated = await UpdateAutoReply(db).execute(
        reply.id, AutoReplyUpdate(response_text="new"),
        owner_id=test_user.id, bot_id=test_bot.id,
    )
    await db.commit()
    assert updated.response_text == "new"


@pytest.mark.asyncio
async def test_delete_auto_reply(db, test_user, test_bot):
    reply = await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(keywords=["bye"], response_text="bye"),
        owner_id=test_user.id,
    )
    await db.commit()
    rid = reply.id

    await DeleteAutoReply(db).execute(rid, owner_id=test_user.id, bot_id=test_bot.id)
    await db.commit()
    remaining = (await db.execute(
        select(AutoReply).where(AutoReply.id == rid)
    )).scalar_one_or_none()
    assert remaining is None


@pytest.mark.asyncio
async def test_find_or_404(db, test_user, test_bot):
    with pytest.raises(HTTPException) as exc:
        await find_auto_reply_or_404(db, 99999, owner_id=test_user.id, bot_id=test_bot.id)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_find_by_text_matches_keyword(db, test_user, test_bot):
    await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(keywords=["спасибо"], response_text="пожалуйста"),
        owner_id=test_user.id,
    )
    await db.commit()

    found = await FindAutoReplyByText(db).execute(
        test_bot.id, "Большое СПАСИБО за помощь", chat_id=100, user_id=200,
    )
    assert found is not None
    assert found.response_text == "пожалуйста"


@pytest.mark.asyncio
async def test_find_by_text_returns_none_for_no_match(db, test_user, test_bot):
    await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(keywords=["hello"], response_text="hi"),
        owner_id=test_user.id,
    )
    await db.commit()

    found = await FindAutoReplyByText(db).execute(
        test_bot.id, "random text", chat_id=1,
    )
    assert found is None


@pytest.mark.asyncio
async def test_find_by_text_ignores_inactive(db, test_user, test_bot):
    await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(keywords=["off"], response_text="!", is_active=False),
        owner_id=test_user.id,
    )
    await db.commit()

    found = await FindAutoReplyByText(db).execute(test_bot.id, "off", chat_id=1)
    assert found is None


@pytest.mark.asyncio
async def test_frequency_check_allows_first_time(db, test_user, test_bot):
    reply = await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(
            keywords=["k"], response_text="r",
            frequency_limit_minutes=60, frequency_limit_type="per_chat",
        ),
        owner_id=test_user.id,
    )
    await db.commit()

    allowed = await is_allowed_by_frequency(db, reply, chat_id=100, user_id=None)
    assert allowed is True


@pytest.mark.asyncio
async def test_frequency_check_blocks_recent_trigger(db, test_user, test_bot):
    reply = await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(
            keywords=["k"], response_text="r",
            frequency_limit_minutes=60, frequency_limit_type="per_chat",
        ),
        owner_id=test_user.id,
    )
    await db.commit()

    db.add(AutoReplyLog(
        auto_reply_id=reply.id, chat_id=100, user_id=None,
        triggered_at=datetime.now(timezone.utc) - timedelta(minutes=10),
    ))
    await db.commit()

    allowed = await is_allowed_by_frequency(db, reply, chat_id=100, user_id=None)
    assert allowed is False


@pytest.mark.asyncio
async def test_frequency_check_allows_after_window(db, test_user, test_bot):
    reply = await CreateAutoReply(db).execute(
        test_bot.id,
        AutoReplyCreate(
            keywords=["k"], response_text="r",
            frequency_limit_minutes=60, frequency_limit_type="per_chat",
        ),
        owner_id=test_user.id,
    )
    await db.commit()

    db.add(AutoReplyLog(
        auto_reply_id=reply.id, chat_id=100, user_id=None,
        triggered_at=datetime.now(timezone.utc) - timedelta(hours=2),
    ))
    await db.commit()

    allowed = await is_allowed_by_frequency(db, reply, chat_id=100, user_id=None)
    assert allowed is True
