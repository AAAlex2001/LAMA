from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.landing import Locale
from backend.schemas.knowledge_base import (
    CreateKBCategoryRequest,
    UpdateKBCategoryRequest,
    CreateKBArticleRequest,
    UpdateKBArticleRequest,
    FeedbackRequest,
    ArticleListResponse,
    ArticleResponse,
    CategoryResponse,
    FeedbackResponse,
    NavigationCategory,
    ArticleCreatedResponse,
    ArticleUpdatedResponse,
    StatusResponse,
)
from backend.services import knowledge_base as kb_service

router = APIRouter()


def parse_locale(locale: str) -> Locale:
    normalized = (locale or "ru").strip().lower()
    mapping = {"ru": Locale.RU, "sr": Locale.SR, "en": Locale.EN}
    return mapping.get(normalized, Locale.RU)


# --------------- Public ---------------

@router.get("/articles", response_model=ArticleListResponse)
async def list_articles(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru"),
    category: str | None = Query(default=None),
) -> ArticleListResponse:
    parsed = parse_locale(locale)
    return await kb_service.list_articles(db, locale=parsed.value, category_slug=category)


@router.get("/articles/slug/{slug}", response_model=ArticleResponse)
async def get_article(
    slug: str = Path(min_length=1),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru"),
) -> ArticleResponse:
    parsed = parse_locale(locale)
    return await kb_service.get_article_by_slug(db, slug=slug, locale=parsed.value)


@router.get("/navigation", response_model=list[NavigationCategory])
async def get_navigation(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru"),
) -> list[NavigationCategory]:
    parsed = parse_locale(locale)
    return await kb_service.get_navigation(db, locale=parsed.value)


@router.post("/articles/slug/{slug}/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    data: FeedbackRequest,
    slug: str = Path(min_length=1),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru"),
) -> FeedbackResponse:
    parsed = parse_locale(locale)
    return await kb_service.submit_feedback(db, slug=slug, locale=parsed.value, action=data.action)


# --------------- Admin ---------------

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CreateKBCategoryRequest,
    db: AsyncSession = Depends(get_db),
) -> CategoryResponse:
    return await kb_service.create_category(
        db, slug=data.slug, title=data.title, locale=data.locale, order=data.order,
    )


@router.patch("/categories/slug/{slug}", response_model=CategoryResponse)
async def update_category(
    data: UpdateKBCategoryRequest,
    slug: str = Path(min_length=1),
    db: AsyncSession = Depends(get_db),
) -> CategoryResponse:
    return await kb_service.update_category(
        db, slug=slug, title=data.title, order=data.order, is_active=data.is_active,
    )


@router.delete("/categories/slug/{slug}", response_model=StatusResponse)
async def delete_category(
    slug: str = Path(min_length=1),
    db: AsyncSession = Depends(get_db),
) -> StatusResponse:
    await kb_service.delete_category(db, slug=slug)
    return StatusResponse(status="ok", message="Category deleted")


@router.post("/articles", response_model=ArticleCreatedResponse)
async def create_article(
    data: CreateKBArticleRequest,
    db: AsyncSession = Depends(get_db),
) -> ArticleCreatedResponse:
    sections = [s.model_dump() for s in data.sections] if data.sections else []
    return await kb_service.create_article(
        db,
        category_slug=data.categorySlug,
        slug=data.slug,
        title=data.title,
        description=data.description,
        locale=data.locale,
        reading_minutes=data.readingMinutes,
        sections=sections,
        card_title=data.cardTitle,
        card_description=data.cardDescription,
        meta_title=data.metaTitle,
        meta_description=data.metaDescription,
        order=data.order,
    )


@router.patch("/articles/slug/{slug}", response_model=ArticleUpdatedResponse)
async def update_article(
    data: UpdateKBArticleRequest,
    slug: str = Path(min_length=1),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru"),
) -> ArticleUpdatedResponse:
    parsed = parse_locale(locale)
    sections = [s.model_dump() for s in data.sections] if data.sections else None
    return await kb_service.update_article(
        db,
        slug=slug,
        locale=parsed.value,
        category_slug=data.categorySlug,
        title=data.title,
        description=data.description,
        reading_minutes=data.readingMinutes,
        sections=sections,
        card_title=data.cardTitle,
        card_description=data.cardDescription,
        meta_title=data.metaTitle,
        meta_description=data.metaDescription,
        order=data.order,
        is_active=data.is_active,
    )


@router.delete("/articles/slug/{slug}", response_model=StatusResponse)
async def delete_article(
    slug: str = Path(min_length=1),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru"),
) -> StatusResponse:
    parsed = parse_locale(locale)
    await kb_service.delete_article(db, slug=slug, locale=parsed.value)
    return StatusResponse(status="ok", message="Article deleted")
