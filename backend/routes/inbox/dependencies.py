from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.services.inbox.query_service import InboxQueryService
from backend.services.inbox.action_service import InboxActionService

async def get_inbox_query_service(db: AsyncSession = Depends(get_db)) -> InboxQueryService:
    return InboxQueryService(db)

async def get_inbox_action_service(db: AsyncSession = Depends(get_db)) -> InboxActionService:
    return InboxActionService(db)
