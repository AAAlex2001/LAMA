from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import PendingApproval


@dataclass(frozen=True)
class CaptchaCallbackData:
    """Распарсенный captcha-callback: pending_id + user_answer."""

    pending_id: int
    user_answer: str


class GetCaptcha:
    """Парсит captcha-callback, ищет chat_id у PendingApproval."""

    def __init__(self, db: AsyncSession | None = None):
        self.db = db

    def from_callback(self, data: str | None, group: bool = False) -> CaptchaCallbackData | None:
        parts = (data or "").split("_")
        min_len = 4 if group else 3
        if len(parts) < min_len:
            return None

        pending_index = 2 if group else 1
        answer_index = 3 if group else 2
        try:
            return CaptchaCallbackData(
                pending_id=int(parts[pending_index]),
                user_answer=parts[answer_index],
            )
        except ValueError:
            return None

    async def get_chat_id(self, pending_id: int) -> int:
        if not self.db:
            return 0
        result = await self.db.execute(
            select(PendingApproval.chat_id).where(PendingApproval.id == pending_id)
        )
        return result.scalar_one_or_none() or 0
