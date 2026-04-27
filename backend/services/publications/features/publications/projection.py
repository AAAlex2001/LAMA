"""Проекция повторяющейся публикации на конкретное время — для календарных выдач."""

from datetime import datetime, timezone
from types import SimpleNamespace

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
)
from backend.services.publications.features.publications.column_loaders import (
    PUB_COMPACT_COLUMNS,
)


def make_scheduled_projection(pub: Publication, projected_time: datetime) -> SimpleNamespace:
    """Копия публикации с подменённым scheduled_time (для будущих повторов)."""
    proxy = SimpleNamespace()
    for col in PUB_COMPACT_COLUMNS:
        setattr(proxy, col.key, getattr(pub, col.key))
    aware = projected_time.replace(tzinfo=timezone.utc) if projected_time.tzinfo is None else projected_time
    proxy.scheduled_time = aware
    if aware > datetime.now(timezone.utc):
        proxy.status = DBPublicationStatus.SCHEDULED
    proxy.channels = pub.channels
    proxy.tags = pub.tags
    return proxy
