"""Проверка ответа на капчу с учётом TTL и max_attempts."""

from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval

MAX_ATTEMPTS = 3


class CheckCaptchaAnswer:
    """Возвращает (is_correct, reason)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        pending_id: int,
        user_answer: str,
        solver_user_id: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """reason ∈ {'not_found','not_allowed','expired','ok','wrong'}."""
        pending = (await self.db.execute(
            select(PendingApproval).where(PendingApproval.id == pending_id)
        )).scalar_one_or_none()

        if pending is None:
            return False, "not_found"

        if solver_user_id is not None and pending.user_id != solver_user_id:
            return False, "not_allowed"

        if is_expired(pending):
            pending.is_rejected = True
            await self.db.flush()
            return False, "expired"

        pending.attempts += 1

        if is_correct_answer(pending.captcha_answer, user_answer):
            pending.is_approved = True
            await self.db.flush()
            return True, "ok"

        if pending.attempts >= MAX_ATTEMPTS:
            pending.is_rejected = True
        await self.db.flush()
        return False, "wrong"


def is_expired(pending: PendingApproval) -> bool:
    """True если истёк срок действия капчи. Naive datetime трактуется как UTC."""
    if not pending.expires_at:
        return False
    expires = pending.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expires


def is_correct_answer(stored: Optional[str], user_answer: str) -> bool:
    """Регистронезависимое сравнение с трим'ом."""
    if not stored:
        return False
    return stored.lower().strip() == user_answer.lower().strip()
