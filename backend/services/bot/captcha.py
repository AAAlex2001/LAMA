from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval


class CaptchaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def generate_captcha(self) -> Tuple[str, str]:
        """Генерировать простой математический пример: a + b = ?"""
        import random

        num1 = random.randint(1, 10)
        num2 = random.randint(1, 10)
        answer = num1 + num2

        question = f"Сколько будет {num1} + {num2}?"
        return question, str(answer)

    async def create_pending_approval(
        self,
        bot_id: int,
        user_id: int,
        chat_id: int,
        captcha_question: str,
        captcha_answer: str,
    ) -> PendingApproval:
        """Создать запись ожидающей одобрения заявки с капчей"""
        pending = PendingApproval(
            bot_id=bot_id,
            user_id=user_id,
            chat_id=chat_id,
            captcha_question=captcha_question,
            captcha_answer=captcha_answer,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

        self.db.add(pending)
        await self.db.commit()
        await self.db.refresh(pending)
        return pending

    async def get_pending_approval(
        self,
        bot_id: int,
        user_id: int,
    ) -> Optional[PendingApproval]:
        """Получить активную заявку пользователя с капчей"""
        query = select(PendingApproval).where(
            PendingApproval.bot_id == bot_id,
            PendingApproval.user_id == user_id,
            PendingApproval.is_approved == False,  # noqa: E712
            PendingApproval.is_rejected == False,  # noqa: E712
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def check_captcha_answer(
        self,
        pending_id: int,
        user_answer: str,
        solver_user_id: Optional[int] = None,
    ) -> tuple[bool, str]:
        """Проверить ответ на капчу.

        Возвращает кортеж `(is_correct, reason)` где `reason` в {'ok','not_allowed','expired','wrong','not_found'}.
        """
        query = select(PendingApproval).where(PendingApproval.id == pending_id)
        result = await self.db.execute(query)
        pending = result.scalar_one_or_none()

        if not pending:
            return False, "not_found"

        if solver_user_id is not None and pending.user_id != solver_user_id:
            return False, "not_allowed"

        # Проверяем срок действия
        if pending.expires_at and datetime.now(timezone.utc) > pending.expires_at:
            pending.is_rejected = True
            await self.db.commit()
            return False, "expired"

        # Увеличиваем счётчик попыток
        pending.attempts += 1

        # Проверяем ответ (регистронезависимо)
        if pending.captcha_answer and pending.captcha_answer.lower().strip() == user_answer.lower().strip():
            pending.is_approved = True
            await self.db.commit()
            return True, "ok"

        # Неправильный ответ
        if pending.attempts >= 3:
            pending.is_rejected = True
        await self.db.commit()
        return False, "wrong"


