"""Парсер времени для модерационных команд: '10m' / '1h' / '2d' / '30' → минуты."""

UNIT_MULTIPLIERS_TO_MINUTES = {
    "s": 1 / 60,
    "m": 1,
    "h": 60,
    "d": 1440,
}


def parse_time(time_str: str) -> int:
    """Минуты из строки. Без единицы — минуты. Не-число → 0."""
    if not time_str or not time_str[0].isdigit():
        return 0

    digits, unit = split_digits_and_unit(time_str)
    if not digits:
        return 0

    return int(int(digits) * UNIT_MULTIPLIERS_TO_MINUTES.get(unit, 1))


def split_digits_and_unit(time_str: str) -> tuple[str, str]:
    """('123', 'h') из '123h'; ('30', 'm') из '30'."""
    digits = ""
    unit = "m"
    for char in time_str:
        if char.isdigit():
            digits += char
            continue
        unit = char.lower()
        break
    return digits, unit
