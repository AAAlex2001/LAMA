"""Полный сброс настроек повтора публикации."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    RepeatInterval as DBRepeatInterval,
)


class CancelRepeat:
    """Зануляет все repeat_*-поля и ставит repeat_interval=NEVER."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, publication: Publication) -> None:
        publication.repeat_interval = DBRepeatInterval.NEVER
        publication.repeat_end_time = None
        publication.next_repeat_time = None
        publication.repeat_custom_days = None
        publication.repeat_custom_hours = None
        publication.repeat_custom_unit = None
        publication.repeat_custom_value = None
        publication.repeat_weekdays = None
        publication.repeat_month_days = None
        publication.repeat_year_month = None
        publication.repeat_year_days = None
        await self.db.flush()
