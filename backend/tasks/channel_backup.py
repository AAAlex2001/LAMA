"""
Задача мгновенных бекапов была нужна, когда мы опрашивали пользовательские боты.
Теперь бекапы/ретрансляции выполняются синхронно мастер-ботом при публикации,
поэтому отдельный polling отключён.
"""

from backend.database import AsyncSessionLocal


async def process_instant_backups():
    async with AsyncSessionLocal():
        return
