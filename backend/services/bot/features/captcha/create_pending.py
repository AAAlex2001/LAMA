"""Создание PendingApproval с математической капчей и TTL."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval

CAPTCHA_TTL_MINUTES = 5


class CreatePendingApproval:
    """Записывает в БД ожидающую заявку с вопросом-ответом капчи."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self, bot_id: int, user_id: int, chat_id: int,
        question: str, answer: str,
    ) -> PendingApproval:
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
