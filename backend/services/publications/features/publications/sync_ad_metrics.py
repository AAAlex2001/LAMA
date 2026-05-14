"""Периодическая синхронизация метрик опубликованных постов из Telegram.

Стратегия:
- Берём `telegram_messages`, привязанные к опубликованным публикациям (любого типа).
- Сортируем по `metrics_synced_at` (NULL first) — обновляем самые устаревшие.
- Лимит на запуск: `batch_size` (по умолчанию 100), чтобы уложиться в rate-limit.
- Метрики берутся через Telegram API. Точка подключения чтения реальных метрик —
  `read_metrics_from_telegram` (заглушка ниже, помечена интеграция с user-bot/Telethon).
"""

from datetime import datetime, timezone
from typing import List

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    TelegramMessage,
)


DEFAULT_BATCH_SIZE = 100


class SyncAdPostMetrics:
    """Обновляет views/forwards/reactions/comments для опубликованных постов.

    Имя класса историческое; работает для всех опубликованных публикаций (не только
    рекламных), потому что метрики имеют смысл для любых каналов.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, batch_size: int = DEFAULT_BATCH_SIZE) -> int:
        candidates = await self._fetch_candidates(batch_size)
        if not candidates:
            return 0

        now = datetime.now(timezone.utc)
        ids = [c.id for c in candidates]
        # Здесь подключается реальный вызов Telegram. Сейчас отмечаем только
        # `metrics_synced_at`, сохраняя порядок ротации. См. read_metrics_from_telegram.
        await self.db.execute(
            update(TelegramMessage)
            .where(TelegramMessage.id.in_(ids))
            .values(metrics_synced_at=now)
        )
        await self.db.commit()
        return len(ids)

    async def _fetch_candidates(self, limit: int) -> List[TelegramMessage]:
        stmt = (
            select(TelegramMessage)
            .join(Publication, Publication.id == TelegramMessage.publication_id)
            .where(
                Publication.status.in_(
                    [
                        DBPublicationStatus.PUBLISHED,
                        DBPublicationStatus.PARTIAL_SUCCESS,
                    ]
                ),
            )
            .order_by(TelegramMessage.metrics_synced_at.asc().nulls_first())
            .limit(limit)
        )
        return list((await self.db.execute(stmt)).scalars().all())
