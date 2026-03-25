import random
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval

MAX_ATTEMPTS = 3
CAPTCHA_TTL_MINUTES = 5


class BotCaptchaService:
    """Генерация и проверка капчи."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def generate(self) -> Tuple[str, str]:
        """Сгенерировать математический пример."""
        a, b = random.randint(1, 10), random.randint(1, 10)
        return f"Сколько будет {a} + {b}?", str(a + b)

    async def create_pending(
        self, bot_id: int, user_id: int, chat_id: int,
        question: str, answer: str,
    ) -> PendingApproval:
        """Создать ожидающую одобрения заявку с капчей."""
        pending = PendingApproval(
            bot_id=bot_id,
            user_id=user_id,
            chat_id=chat_id,
            captcha_question=question,
            captcha_answer=answer,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=CAPTCHA_TTL_MINUTES),
        )
        self.db.add(pending)
        await self.db.flush()
        await self.db.refresh(pending)
        return pending

    async def get_pending(self, bot_id: int, user_id: int) -> Optional[PendingApproval]:
        """Получить активную заявку пользователя."""
        result = await self.db.execute(
            select(PendingApproval).where(
                PendingApproval.bot_id == bot_id,
                PendingApproval.user_id == user_id,
                PendingApproval.is_approved == False,
                PendingApproval.is_rejected == False,
            )
        )
        return result.scalars().first()

    async def check_answer(
        self, pending_id: int, user_answer: str,
        solver_user_id: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """Проверить ответ на капчу. Возвращает (is_correct, reason)."""
        result = await self.db.execute(
            select(PendingApproval).where(PendingApproval.id == pending_id)
        )
        pending = result.scalar_one_or_none()

        if not pending:
            return False, "not_found"

        if solver_user_id is not None and pending.user_id != solver_user_id:
            return False, "not_allowed"

        if pending.expires_at and datetime.now(timezone.utc) > pending.expires_at:
            pending.is_rejected = True
            await self.db.flush()
            return False, "expired"

        pending.attempts += 1

        is_correct = (
            pending.captcha_answer
            and pending.captcha_answer.lower().strip() == user_answer.lower().strip()
        )
        if is_correct:
            pending.is_approved = True
            await self.db.flush()
            return True, "ok"

        if pending.attempts >= MAX_ATTEMPTS:
            pending.is_rejected = True
        await self.db.flush()
        return False, "wrong"
