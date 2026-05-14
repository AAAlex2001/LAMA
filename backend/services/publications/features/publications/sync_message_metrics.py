import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional, Sequence

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.channels import ChannelGroup
from backend.models.publications import (
    Publication,
    PublicationStatus as DBPublicationStatus,
    TelegramMessage,
)


logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE = 200
HTTP_CONCURRENCY = 8
HTTP_TIMEOUT = 10.0
RATE_LIMIT_PAUSE_SECONDS = 30.0
PUBLISHED_STATUSES = (DBPublicationStatus.PUBLISHED, DBPublicationStatus.PARTIAL_SUCCESS)
USER_AGENT = "Mozilla/5.0 (compatible; LAMA-MetricsBot/1.0)"


@dataclass
class FetchedMetrics:
    views: int = 0
    forwards: int = 0
    reactions: int = 0
    comments: int = 0


class SyncMessageMetrics:
    """Полный ночной обход: парсит t.me-страницы опубликованных сообщений и обновляет метрики."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(self, chunk_size: int = DEFAULT_CHUNK_SIZE) -> int:
        processed = 0
        sem = asyncio.Semaphore(HTTP_CONCURRENCY)
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"},
        ) as client:
            while True:
                chunk = await self.fetch_chunk(processed, chunk_size)
                if not chunk:
                    break
                await self.process_chunk(client, sem, chunk)
                await self.db.flush()
                processed += len(chunk)
                if len(chunk) < chunk_size:
                    break
        return processed

    async def fetch_chunk(self, offset: int, limit: int) -> List[TelegramMessage]:
        stmt = (
            select(TelegramMessage)
            .options(selectinload(TelegramMessage.channel))
            .join(Publication, Publication.id == TelegramMessage.publication_id)
            .where(Publication.status.in_(PUBLISHED_STATUSES))
            .order_by(TelegramMessage.id.asc())
            .offset(offset)
            .limit(limit)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def process_chunk(
        self,
        client: httpx.AsyncClient,
        sem: asyncio.Semaphore,
        chunk: Sequence[TelegramMessage],
    ) -> None:
        tasks = [self.process_message(client, sem, m) for m in chunk]
        await asyncio.gather(*tasks, return_exceptions=False)

    async def process_message(
        self,
        client: httpx.AsyncClient,
        sem: asyncio.Semaphore,
        message: TelegramMessage,
    ) -> None:
        username = channel_username(message.channel)
        metrics: Optional[FetchedMetrics] = None
        if username and message.telegram_message_id:
            async with sem:
                metrics = await fetch_message_metrics(client, username, message.telegram_message_id)

        values = {"metrics_synced_at": datetime.now(timezone.utc)}
        if metrics is not None:
            values["views_count"] = metrics.views
            values["forwards_count"] = metrics.forwards
            values["reactions_count"] = metrics.reactions
            values["comments_count"] = metrics.comments

        try:
            await self.db.execute(
                update(TelegramMessage).where(TelegramMessage.id == message.id).values(**values)
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("metrics_update_failed: id=%s err=%s", message.id, exc)


def channel_username(channel: Optional[ChannelGroup]) -> Optional[str]:
    if not channel:
        return None
    raw = getattr(channel, "username", None)
    if not raw:
        return None
    return raw.lstrip("@").strip() or None


async def fetch_message_metrics(
    client: httpx.AsyncClient,
    username: str,
    message_id: int,
) -> Optional[FetchedMetrics]:
    url = f"https://t.me/{username}/{message_id}?embed=1&mode=tme"
    try:
        response = await client.get(url, follow_redirects=True)
    except httpx.HTTPError as exc:
        logger.warning("metrics_fetch_failed: url=%s err=%s", url, exc)
        return None
    if response.status_code == 429:
        logger.warning("metrics_rate_limited: url=%s pausing=%ss", url, RATE_LIMIT_PAUSE_SECONDS)
        await asyncio.sleep(RATE_LIMIT_PAUSE_SECONDS)
        return None
    if response.status_code in (403, 404):
        return None
    if response.status_code != 200:
        logger.debug("metrics_fetch_status: url=%s status=%s", url, response.status_code)
        return None
    return parse_tme_embed(response.text)


def parse_tme_embed(html: str) -> FetchedMetrics:
    soup = BeautifulSoup(html, "html.parser")
    return FetchedMetrics(
        views=count_from(soup, "tgme_widget_message_views"),
        forwards=count_from(soup, "tgme_widget_message_forwards"),
        reactions=sum_reactions(soup),
        comments=count_comments(soup),
    )


def count_from(soup: BeautifulSoup, class_name: str) -> int:
    node = soup.find(class_=class_name)
    return parse_compact_number(node.get_text(strip=True)) if node else 0


def count_comments(soup: BeautifulSoup) -> int:
    node = soup.find(class_="tgme_widget_message_link_replies_count")
    if node is None:
        node = soup.find(class_="tgme_widget_message_link_replies")
    if node is None:
        return 0
    text = node.get_text(" ", strip=True)
    match = re.search(r"[\d.,KMB]+", text, flags=re.IGNORECASE)
    return parse_compact_number(match.group(0)) if match else 0


def sum_reactions(soup: BeautifulSoup) -> int:
    return sum(
        parse_compact_number(node.get_text(strip=True))
        for node in soup.find_all(class_="tgme_widget_message_reaction_count")
    )


COMPACT_MULTIPLIERS = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}


def parse_compact_number(text: str) -> int:
    if not text:
        return 0
    cleaned = text.replace("\xa0", "").replace(" ", "").replace(",", ".")
    match = re.match(r"^([\d.]+)([KMB])?$", cleaned, flags=re.IGNORECASE)
    if not match:
        digits = re.sub(r"[^\d]", "", cleaned)
        return int(digits) if digits else 0
    number = float(match.group(1)) if match.group(1) else 0.0
    suffix = (match.group(2) or "").upper()
    return int(number * COMPACT_MULTIPLIERS.get(suffix, 1))
