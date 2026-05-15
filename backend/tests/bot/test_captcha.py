"""Тесты капчи: генератор, создание pending, проверка ответа."""

from datetime import datetime, timedelta, timezone

import pytest

from backend.models.bots import PendingApproval
from backend.services.bot.features.captcha.check_answer import (
    CheckCaptchaAnswer,
    MAX_ATTEMPTS,
    is_correct_answer,
    is_expired,
)
from backend.services.bot.features.captcha.create_pending import (
    CAPTCHA_TTL_MINUTES,
    CreatePendingApproval,
)
from backend.services.bot.features.captcha.generate_captcha import generate_captcha
from backend.services.bot.features.captcha.get_pending import get_pending_approval


def test_generate_captcha_returns_question_and_answer():
    question, answer = generate_captcha()
    assert "Сколько будет" in question
    assert answer.isdigit()


def test_generate_captcha_answer_matches_question():
    for _ in range(20):
        question, answer = generate_captcha()
        # достаём числа из строки "Сколько будет A + B?"
        numbers = [int(s) for s in question.split() if s.isdigit()]
        assert len(numbers) == 2
        assert int(answer) == numbers[0] + numbers[1]


def test_is_correct_answer_case_insensitive():
    assert is_correct_answer("HELLO", "hello") is True
    assert is_correct_answer("12", "  12 ") is True
    assert is_correct_answer("12", "13") is False
    assert is_correct_answer(None, "anything") is False


def test_is_expired_when_past():
    pending = PendingApproval(
        bot_id=1, user_id=2, chat_id=3,
        captcha_question="q", captcha_answer="42",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    assert is_expired(pending) is True


def test_is_not_expired_when_future():
    pending = PendingApproval(
        bot_id=1, user_id=2, chat_id=3,
        captcha_question="q", captcha_answer="42",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    assert is_expired(pending) is False


@pytest.mark.asyncio
async def test_create_pending_writes_db(db):
    pending = await CreatePendingApproval(db).execute(
        bot_id=1, user_id=100, chat_id=200,
        question="2+2=?", answer="4",
    )
    await db.commit()
    assert pending.id is not None
    assert pending.captcha_question == "2+2=?"
    assert pending.captcha_answer == "4"
    # TTL = CAPTCHA_TTL_MINUTES
    assert pending.expires_at is not None
    assert (pending.expires_at - datetime.now(timezone.utc)).total_seconds() < CAPTCHA_TTL_MINUTES * 60 + 5


@pytest.mark.asyncio
async def test_get_pending_active_only(db):
    db.add(PendingApproval(
        bot_id=1, user_id=100, chat_id=200,
        captcha_question="q1", captcha_answer="a", is_approved=False, is_rejected=False,
    ))
    db.add(PendingApproval(
        bot_id=1, user_id=100, chat_id=200,
        captcha_question="q2", captcha_answer="a", is_approved=True,
    ))
    await db.commit()

    found = await get_pending_approval(db, bot_id=1, user_id=100)
    assert found is not None
    assert found.captcha_question == "q1"


@pytest.mark.asyncio
async def test_check_answer_correct(db):
    pending = await CreatePendingApproval(db).execute(
        bot_id=1, user_id=10, chat_id=20, question="q", answer="42",
    )
    await db.commit()

    ok, reason = await CheckCaptchaAnswer(db).execute(pending.id, "42")
    await db.commit()
    assert ok is True
    assert reason == "ok"
    assert pending.is_approved is True


@pytest.mark.asyncio
async def test_check_answer_wrong(db):
    pending = await CreatePendingApproval(db).execute(
        bot_id=1, user_id=10, chat_id=20, question="q", answer="42",
    )
    await db.commit()

    ok, reason = await CheckCaptchaAnswer(db).execute(pending.id, "100")
    await db.commit()
    assert ok is False
    assert reason == "wrong"
    assert pending.attempts == 1
    assert pending.is_rejected is False


@pytest.mark.asyncio
async def test_check_answer_rejects_after_max_attempts(db):
    pending = await CreatePendingApproval(db).execute(
        bot_id=1, user_id=10, chat_id=20, question="q", answer="42",
    )
    await db.commit()

    for _ in range(MAX_ATTEMPTS):
        await CheckCaptchaAnswer(db).execute(pending.id, "wrong")
    await db.commit()
    assert pending.is_rejected is True


@pytest.mark.asyncio
async def test_check_answer_not_found(db):
    ok, reason = await CheckCaptchaAnswer(db).execute(99999, "42")
    assert ok is False
    assert reason == "not_found"


@pytest.mark.asyncio
async def test_check_answer_not_allowed_for_other_user(db):
    pending = await CreatePendingApproval(db).execute(
        bot_id=1, user_id=10, chat_id=20, question="q", answer="42",
    )
    await db.commit()

    ok, reason = await CheckCaptchaAnswer(db).execute(
        pending.id, "42", solver_user_id=999,
    )
    assert ok is False
    assert reason == "not_allowed"


@pytest.mark.asyncio
async def test_check_answer_expired(db):
    pending = PendingApproval(
        bot_id=1, user_id=10, chat_id=20,
        captcha_question="q", captcha_answer="42",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db.add(pending)
    await db.commit()
    await db.refresh(pending)

    ok, reason = await CheckCaptchaAnswer(db).execute(pending.id, "42")
    await db.commit()
    assert ok is False
    assert reason == "expired"
    assert pending.is_rejected is True
