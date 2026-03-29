from datetime import datetime, timedelta
from typing import Optional, List
import calendar as cal_mod

from dateutil.relativedelta import relativedelta

from backend.models.publications import RepeatInterval as DBRepeatInterval

MAX_PERIOD_SEARCH = 120


def normalize_datetime(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def calculate_next_repeat_time(
    base_time: datetime,
    repeat_interval: DBRepeatInterval,
    custom_days: Optional[int] = None,
    custom_hours: Optional[int] = None,
    repeat_end_time: Optional[datetime] = None,
    custom_unit: Optional[str] = None,
    custom_value: Optional[int] = None,
    repeat_weekdays: Optional[List[int]] = None,
    repeat_month_days: Optional[List[int]] = None,
    repeat_year_month: Optional[int] = None,
    repeat_year_days: Optional[List[int]] = None,
) -> Optional[datetime]:
    if repeat_interval == DBRepeatInterval.NEVER:
        return None

    if repeat_interval == DBRepeatInterval.DAILY:
        next_time = base_time + relativedelta(days=1)
    elif repeat_interval == DBRepeatInterval.WEEKLY:
        next_time = base_time + relativedelta(weeks=1)
    elif repeat_interval == DBRepeatInterval.BIWEEKLY:
        next_time = base_time + relativedelta(weeks=2)
    elif repeat_interval == DBRepeatInterval.MONTHLY:
        next_time = base_time + relativedelta(months=1)
    elif repeat_interval == DBRepeatInterval.YEARLY:
        next_time = base_time + relativedelta(years=1)
    elif repeat_interval == DBRepeatInterval.CUSTOM:
        next_time = compute_custom(
            base_time, custom_days, custom_hours, custom_unit, custom_value,
            repeat_weekdays, repeat_month_days, repeat_year_month, repeat_year_days,
        )
    else:
        return None

    if next_time is None:
        return None
    compare_next = normalize_datetime(next_time)
    compare_end = normalize_datetime(repeat_end_time)
    if compare_end and compare_next and compare_next > compare_end:
        return None
    return next_time


def compute_custom(
    base_time: datetime,
    custom_days: Optional[int],
    custom_hours: Optional[int],
    unit: Optional[str],
    value: Optional[int],
    weekdays: Optional[List[int]],
    month_days: Optional[List[int]],
    year_month: Optional[int],
    year_days: Optional[List[int]],
) -> Optional[datetime]:
    if unit and value and value > 0:
        if unit == "days":
            return base_time + relativedelta(days=value)
        if unit == "weeks":
            return find_next_weekly(base_time, value, weekdays)
        if unit == "months":
            return find_next_monthly(base_time, value, month_days)
        if unit == "years":
            return find_next_yearly(base_time, value, year_month, year_days)

    total_days = custom_days or 0
    total_hours = custom_hours or 0
    if total_days == 0 and total_hours == 0:
        return None
    return base_time + relativedelta(days=total_days, hours=total_hours)


def find_next_weekly(
    base_time: datetime,
    value: int,
    weekdays: Optional[List[int]],
) -> Optional[datetime]:
    allowed = weekdays or ([0] if base_time.weekday() == 6 else [base_time.weekday() + 1])
    normalized = sorted({(6 if d == 0 else d - 1) for d in allowed})
    base_date = base_time.date()
    week_start = base_date - timedelta(days=base_date.weekday())
    for offset in range(1, value * 7 * 2 + 1):
        candidate = base_date + timedelta(days=offset)
        weeks_since = ((candidate - week_start).days) // 7
        if weeks_since % value != 0 or candidate.weekday() not in normalized:
            continue
        return base_time.replace(year=candidate.year, month=candidate.month, day=candidate.day)
    return None


def find_next_monthly(
    base_time: datetime,
    value: int,
    month_days: Optional[List[int]],
) -> Optional[datetime]:
    days = sorted(set(month_days or [base_time.day]))
    candidate = base_time + relativedelta(months=value)
    for _ in range(MAX_PERIOD_SEARCH):
        last_day = cal_mod.monthrange(candidate.year, candidate.month)[1]
        valid = [d for d in days if d <= last_day]
        if valid:
            return candidate.replace(day=valid[0])
        candidate += relativedelta(months=value)
    return None


def find_next_yearly(
    base_time: datetime,
    value: int,
    year_month: Optional[int],
    year_days: Optional[List[int]],
) -> Optional[datetime]:
    days = sorted(set(year_days or [base_time.day]))
    month = year_month or base_time.month
    candidate_year = base_time.year + value
    for _ in range(MAX_PERIOD_SEARCH):
        last_day = cal_mod.monthrange(candidate_year, month)[1]
        valid = [d for d in days if d <= last_day]
        if valid:
            return base_time.replace(year=candidate_year, month=month, day=valid[0])
        candidate_year += value
    return None
