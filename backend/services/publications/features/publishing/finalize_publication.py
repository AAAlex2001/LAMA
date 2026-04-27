"""Финализация Publication после публикации: статус + next_repeat_time."""

from datetime import datetime, timezone
from typing import Optional

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    RepeatInterval as DBRepeatInterval,
)


def update_publication_status(
    publication: Publication,
    success_count: int,
    total_count: int,
    calculate_next_repeat_time_callback,
) -> None:
    """0 успехов → FAILED; full → PUBLISHED; partial → PARTIAL_SUCCESS. Считает next_repeat_time."""
    if success_count == 0:
        publication.status = DBPublicationStatus.FAILED
        return

    publication.published_time = datetime.now(timezone.utc)
    publication.status = (
        DBPublicationStatus.PUBLISHED if success_count == total_count
        else DBPublicationStatus.PARTIAL_SUCCESS
    )

    if publication.repeat_interval and publication.repeat_interval != DBRepeatInterval.NEVER:
        base_time = publication.scheduled_time or publication.published_time
        publication.next_repeat_time = compute_next_repeat(
            publication, base_time, calculate_next_repeat_time_callback,
        )


def compute_next_repeat(
    publication: Publication, base_time: datetime, calculate_fn,
) -> Optional[datetime]:
    """Передаёт все repeat_*-поля публикации в калькулятор и возвращает следующее время."""
    return calculate_fn(
        base_time,
        publication.repeat_interval,
        publication.repeat_custom_days,
        publication.repeat_custom_hours,
        publication.repeat_end_time,
        publication.repeat_custom_unit,
        publication.repeat_custom_value,
        publication.repeat_weekdays,
        publication.repeat_month_days,
        publication.repeat_year_month,
        publication.repeat_year_days,
    )
