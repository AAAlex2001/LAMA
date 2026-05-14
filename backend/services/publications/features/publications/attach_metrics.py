from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import Publication, TelegramMessage


METRIC_FIELDS = (
    "views_count",
    "forwards_count",
    "reactions_count",
    "comments_count",
    "clicks_count",
)


async def attach_publication_metrics(db: AsyncSession, publications: Iterable[Publication]) -> None:
    """Подкачивает суммы метрик по telegram_messages и проставляет их на объекты публикаций.

    Делает один SQL-запрос на все ID. Безопасно для пустого списка.
    """
    items = [p for p in publications if p is not None]
    if not items:
        return

    ids = list({p.id for p in items})
    stmt = (
        select(
            TelegramMessage.publication_id,
            func.coalesce(func.sum(TelegramMessage.views_count), 0),
            func.coalesce(func.sum(TelegramMessage.forwards_count), 0),
            func.coalesce(func.sum(TelegramMessage.reactions_count), 0),
            func.coalesce(func.sum(TelegramMessage.comments_count), 0),
            func.coalesce(func.sum(TelegramMessage.clicks_count), 0),
        )
        .where(TelegramMessage.publication_id.in_(ids))
        .group_by(TelegramMessage.publication_id)
    )
    rows = (await db.execute(stmt)).all()
    totals = {row[0]: row[1:] for row in rows}

    zero = (0, 0, 0, 0, 0)
    for pub in items:
        values = totals.get(pub.id, zero)
        for name, value in zip(METRIC_FIELDS, values):
            setattr(pub, name, int(value))
