from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import ButtonClick


class TrackButtonClick:
    """Идемпотентно записывает клик пользователя по inline-кнопке."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(self, publication_id: int, button_id: str, user_id: int) -> None:
        stmt = (
            insert(ButtonClick)
            .values(
                publication_id=publication_id,
                button_id=button_id,
                user_id=user_id,
            )
            .on_conflict_do_nothing(
                index_elements=["publication_id", "button_id", "user_id"]
            )
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def get_count(self, publication_id: int, button_id: str) -> int:
        result = await self.db.scalar(
            select(func.count())
            .select_from(ButtonClick)
            .where(
                ButtonClick.publication_id == publication_id,
                ButtonClick.button_id == button_id,
            )
        )
        return result or 0
