"""Pure timezone resolver for trigger delivery windows."""

import pytz


def resolve_tz(tz_name: str):
    """Resolve timezone name, falling back to UTC for invalid values."""
    try:
        return pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        return pytz.UTC