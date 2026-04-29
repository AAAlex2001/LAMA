"""Чистые функции расчёта следующего времени отправки повторяющегося сообщения."""

from datetime import datetime, timedelta, timezone
from typing import Optional

import pytz

from backend.models.bots import RecurringMessage, RecurringMessageInterval


def calculate_next_send(msg: RecurringMessage) -> datetime:
    """Следующее UTC-время отправки: сегодняшние оставшиеся time_points → следующая дата."""
    tz = pytz.timezone(msg.timezone)
    now = datetime.now(tz)
    time_points = sorted(msg.time_points)

    today_candidate = pick_today_candidate(now, time_points, msg.weekdays)
    if today_candidate is not None:
        return today_candidate.astimezone(timezone.utc)

    next_date = calculate_next_date(msg, now)
    hour, minute = map(int, time_points[0].split(":"))
    return next_date.replace(
        hour=hour, minute=minute, second=0, microsecond=0,
    ).astimezone(timezone.utc)


def pick_today_candidate(
    now: datetime, time_points: list[str], weekdays: Optional[list],
) -> Optional[datetime]:
    """Первое сегодняшнее время > now с учётом фильтра weekdays. None если нет."""
    for time_str in time_points:
        hour, minute = map(int, time_str.split(":"))
        candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if candidate <= now:
            continue
        if weekdays and candidate.weekday() not in weekdays:
            continue
        return candidate
    return None


def calculate_next_date(msg: RecurringMessage, current: datetime) -> datetime:
    """Следующая дата с учётом interval_type."""
    interval = msg.interval_type

    if interval == RecurringMessageInterval.HOURLY:
        return current + timedelta(hours=1)
    if interval == RecurringMessageInterval.DAILY:
        return current + timedelta(days=1)
    if interval == RecurringMessageInterval.WEEKLY:
        return next_weekly_date(current, msg.weekdays)
    if interval == RecurringMessageInterval.MONTHLY:
        return next_monthly_date(current)
    if interval == RecurringMessageInterval.CUSTOM and msg.interval_value:
        return current + timedelta(minutes=msg.interval_value)
    return current + timedelta(days=1)


def next_weekly_date(current: datetime, weekdays: Optional[list]) -> datetime:
    """Ближайший день недели из weekdays; +7 дней если weekdays пуст."""
    if not weekdays:
        return current + timedelta(weeks=1)

    current_wd = current.weekday()
    upcoming = [d for d in weekdays if d > current_wd]
    if upcoming:
        days_ahead = min(upcoming) - current_wd
    else:
        days_ahead = 7 - current_wd + min(weekdays)
    return current + timedelta(days=days_ahead)


def next_monthly_date(current: datetime) -> datetime:
    """Тот же день в следующем месяце; декабрь → январь следующего года."""
    if current.month == 12:
        return current.replace(year=current.year + 1, month=1)
    return current.replace(month=current.month + 1)
