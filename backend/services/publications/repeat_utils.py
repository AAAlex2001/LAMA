"""Общие утилиты для проекции повторяющихся публикаций."""

from datetime import datetime, timedelta
from typing import Iterator, Optional, Tuple

from dateutil.relativedelta import relativedelta

from backend.models.publications import RepeatInterval as DBRepeatInterval
from backend.services.publications.repeat_calculator import calculate_next_repeat_time

MAX_REPEAT_ITERATIONS = 200


def strip_tz(dt: datetime) -> datetime:
    """Убирает timezone для безопасного сравнения."""
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def fast_forward_to(
    current: datetime,
    target: datetime,
    interval: DBRepeatInterval,
    custom_days: Optional[int],
    custom_hours: Optional[int],
) -> Optional[datetime]:
    """Прыжок к target без пошаговой итерации."""
    current = strip_tz(current)
    target = strip_tz(target)

    if current >= target:
        return current

    diff = target - current

    if interval == DBRepeatInterval.DAILY:
        return current + timedelta(days=diff.days)
    if interval == DBRepeatInterval.WEEKLY:
        return current + timedelta(weeks=diff.days // 7)
    if interval == DBRepeatInterval.BIWEEKLY:
        return current + timedelta(weeks=(diff.days // 14) * 2)
    if interval == DBRepeatInterval.MONTHLY:
        months = (target.year - current.year) * 12 + target.month - current.month
        return current + relativedelta(months=max(0, months - 1))
    if interval == DBRepeatInterval.YEARLY:
        years = target.year - current.year
        return current + relativedelta(years=max(0, years - 1))
    if interval == DBRepeatInterval.CUSTOM:
        days = custom_days or 0
        hours = custom_hours or 0
        step_seconds = days * 86400 + hours * 3600
        if step_seconds > 0:
            jumps = int(diff.total_seconds() // step_seconds)
            return current + timedelta(seconds=jumps * step_seconds)

    return current


def project_repeat_occurrences(
    pub,
    start: datetime,
    end: datetime,
    max_iter: int = MAX_REPEAT_ITERATIONS,
) -> Iterator[Tuple[str, datetime]]:
    """Генерирует (date_str, projected_time) для каждого повтора в [start, end]."""
    naive_start = strip_tz(start)
    naive_end = strip_tz(end)

    base_time = strip_tz(
        getattr(pub, "scheduled_time", None) or pub.next_repeat_time
    )
    current = fast_forward_to(
        base_time, naive_start,
        pub.repeat_interval, pub.repeat_custom_days, pub.repeat_custom_hours,
    )
    if current is None:
        return

    iterations = 0
    while current and current <= naive_end and iterations < max_iter:
        if current >= naive_start:
            yield (current.strftime("%Y-%m-%d"), current)
        current = calculate_next_repeat_time(
            current,
            pub.repeat_interval,
            pub.repeat_custom_days,
            pub.repeat_custom_hours,
            pub.repeat_end_time,
            pub.repeat_custom_unit,
            pub.repeat_custom_value,
            pub.repeat_weekdays,
            pub.repeat_month_days,
            pub.repeat_year_month,
            pub.repeat_year_days,
        )
        iterations += 1
