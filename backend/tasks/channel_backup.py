"""
Задача мгновенных бекапов была нужна, когда мы опрашивали пользовательские боты.
Теперь бекапы/ретрансляции выполняются синхронно мастер-ботом при публикации,
поэтому отдельный polling отключён.
"""

from backend.database import CelerySessionLocal


async def process_instant_backups():
    async with CelerySessionLocal():
        return
