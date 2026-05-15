from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.auth import User
from backend.routes.auth.dependencies import get_current_user
from backend.schemas.auth import SessionListResponse, UserResponse, UserStatsResponse
from backend.services.auth.features.sessions.list_user_sessions import ListUserSessions
from backend.services.auth.features.sessions.revoke_user_session import RevokeUserSession
from backend.services.auth.features.users.get_user_stats import GetUserStats

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Профиль текущего юзера",
    description="Возвращает юзера, чей access-токен пришёл в `Authorization: Bearer ...`.",
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.get(
    "/me/stats",
    response_model=UserStatsResponse,
    summary="Счётчики текущего юзера",
    description=(
        "Возвращает количество ботов / каналов / публикаций / сессий текущего юзера "
        "(всего и активных)."
    ),
)
async def get_current_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await GetUserStats(db).execute(current_user.id)


@router.get(
    "/me/sessions",
    response_model=SessionListResponse,
    summary="Активные сессии текущего юзера",
    description=(
        "Список строк `user_sessions` юзера (включая `is_active=False`) с User-Agent / IP. "
        "Сортировка — новые сверху."
    ),
)
async def get_current_user_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions, total = await ListUserSessions(db).execute(current_user.id)
    return SessionListResponse(items=sessions, total=total)


@router.delete(
    "/me/sessions/{session_id}",
    status_code=204,
    summary="Отозвать сессию",
    description=(
        "Помечает чужую (для текущего юзера) сессию `is_active=False`. 404 если такой "
        "сессии нет или она принадлежит другому юзеру."
    ),
)
async def revoke_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await RevokeUserSession(db).execute(session_id, current_user.id)
    return Response(status_code=204)
