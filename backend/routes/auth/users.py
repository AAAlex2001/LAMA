from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.routes.auth.dependencies import get_current_admin
from backend.schemas.auth import UserResponse, UserStatsResponse, UserUpdateRequest
from backend.services.auth.features.users.delete_user import DeleteUser
from backend.services.auth.features.users.get_user import GetUser
from backend.services.auth.features.users.get_user_stats import GetUserStats
from backend.services.auth.features.users.update_user import UpdateUser

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await GetUser(db).execute(user_id)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await UpdateUser(db).execute(
        user_id=user_id,
        role=data.role,
        is_active=data.is_active,
    )


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    await DeleteUser(db).execute(user_id)
    return Response(status_code=204)


@router.get("/users/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await GetUserStats(db).execute(user_id)
