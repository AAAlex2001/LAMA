"""Перепривязать вебхуки всех активных ботов на текущий WEBHOOK_DOMAIN.

Запуск:
    docker-compose exec backend python -m backend.scripts.resync_webhooks
"""
import asyncio
import logging

from sqlalchemy import select

from backend.database import AsyncSessionLocal
from backend.models import load_models
from backend.models.bots import Bot as BotModel, BotStatus
from backend.services.bot.bot_crud import BotCrudService
from backend.services.bot_provider import resolve_by_token

load_models()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        service = BotCrudService(db)
        result = await db.execute(
            select(BotModel).where(BotModel.status == BotStatus.ACTIVE)
        )
        bots = result.scalars().all()

        logger.info("Resyncing webhooks for %d active bots", len(bots))

        ok, failed = 0, 0
        for bot in bots:
            try:
                raw_bot = resolve_by_token(bot.token).bot
                await service.setup_webhook(raw_bot, bot.token)
                ok += 1
                logger.info("OK   bot_id=%s @%s", bot.id, bot.username)
            except Exception as e:
                failed += 1
                logger.error("FAIL bot_id=%s @%s: %s", bot.id, bot.username, e)

        logger.info("Done. ok=%d failed=%d", ok, failed)


if __name__ == "__main__":
    asyncio.run(main())
