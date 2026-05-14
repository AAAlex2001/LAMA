from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.ad_revenues.features.create_ad_revenue import CreateAdRevenue
from backend.services.ad_revenues.features.delete_ad_revenue import DeleteAdRevenue
from backend.services.ad_revenues.features.get_ad_revenue import GetAdRevenue
from backend.services.ad_revenues.features.get_ad_revenue_stats import GetAdRevenueStats
from backend.services.ad_revenues.features.list_ad_revenues import ListAdRevenues
from backend.services.ad_revenues.features.update_ad_revenue import UpdateAdRevenue


def get_list_service(db: AsyncSession = Depends(get_db)) -> ListAdRevenues:
    return ListAdRevenues(db)


def get_lookup_service(db: AsyncSession = Depends(get_db)) -> GetAdRevenue:
    return GetAdRevenue(db)


def get_create_service(db: AsyncSession = Depends(get_db)) -> CreateAdRevenue:
    return CreateAdRevenue(db)


def get_update_service(db: AsyncSession = Depends(get_db)) -> UpdateAdRevenue:
    return UpdateAdRevenue(db)


def get_delete_service(db: AsyncSession = Depends(get_db)) -> DeleteAdRevenue:
    return DeleteAdRevenue(db)


def get_stats_service(db: AsyncSession = Depends(get_db)) -> GetAdRevenueStats:
    return GetAdRevenueStats(db)
