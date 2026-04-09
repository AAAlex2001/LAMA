from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import case, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm import selectinload

from backend.models.landing import Locale
from backend.models.knowledge_base import KBCategory, KBArticle
from backend.schemas.knowledge_base import (
    ArticleListItem,
    ArticleListResponse,
    ArticleResponse,
    ArticleCreatedResponse,
    ArticleUpdatedResponse,
    CategoryResponse,
    FeedbackResponse,
    NavigationCategory,
    NavigationEntry,
    RelatedArticle,
    ArticleSectionSchema,
)


LOCALE_MAP = {"RU": Locale.RU, "SR": Locale.SR, "EN": Locale.EN}


def coerce_locale(locale: str | Locale | None) -> Locale:
    if isinstance(locale, Locale):
        return locale
    if isinstance(locale, str) and locale in LOCALE_MAP:
        return LOCALE_MAP[locale]
    return Locale.RU


def compute_reading_minutes(sections: list | None) -> int:
    if not sections:
        return 1
    word_count = 0
    for section in sections:
        if not isinstance(section, dict):
            continue
        for key in ("title", "body"):
            val = section.get(key)
            if isinstance(val, str):
                word_count += len(val.split())
        items = section.get("items")
        if isinstance(items, list):
            for item in items:
                if isinstance(item, str):
                    word_count += len(item.split())
    return max(1, round(word_count / 200))


# --------------- Public ---------------

async def list_articles(
    db: AsyncSession,
    locale: str | Locale | None = None,
    category_slug: str | None = None,
) -> ArticleListResponse:
    locale_enum = coerce_locale(locale)
    stmt = (
        select(KBArticle)
        .where(KBArticle.is_active == True)
        .where(KBArticle.locale == locale_enum)
        .order_by(KBArticle.order, KBArticle.id)
    )
    if category_slug:
        cat = await db.execute(
            select(KBCategory.id).where(KBCategory.slug == category_slug.lower().strip())
        )
        cat_id = cat.scalar_one_or_none()
        if cat_id is None:
            return ArticleListResponse(count=0, articles=[])
        stmt = stmt.where(KBArticle.category_id == cat_id)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    cats_map: dict[int, str] = {}
    if rows:
        cat_ids = {a.category_id for a in rows}
        cats_result = await db.execute(select(KBCategory).where(KBCategory.id.in_(cat_ids)))
        cats_map = {c.id: c.slug for c in cats_result.scalars().all()}

    articles = [
        ArticleListItem(
            slug=a.slug,
            title=a.title,
            description=a.description,
            readingMinutes=a.reading_minutes,
            categorySlug=cats_map.get(a.category_id),
        )
        for a in rows
    ]

    return ArticleListResponse(count=len(articles), articles=articles)


async def get_article_by_slug(
    db: AsyncSession,
    slug: str,
    locale: str | Locale | None = None,
) -> ArticleResponse:
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.slug == slug.lower().strip())
        .where(KBArticle.locale == locale_enum)
        .where(KBArticle.is_active == True)
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    cat_result = await db.execute(select(KBCategory).where(KBCategory.id == article.category_id))
    category = cat_result.scalar_one_or_none()

    related: list[RelatedArticle] = []
    raw = article.related_slugs or []
    slugs = [x if isinstance(x, str) else x.get("slug", "") for x in raw]
    slugs = [s for s in slugs if s]
    descs = {x["slug"]: x["description"] for x in raw if isinstance(x, dict) and x.get("description")}

    if slugs:
        rel_result = await db.execute(
            select(KBArticle)
            .where(KBArticle.slug.in_(slugs))
            .where(KBArticle.locale == locale_enum)
            .where(KBArticle.is_active == True)
        )
        for r in rel_result.scalars().all():
            related.append(RelatedArticle(
                slug=r.slug,
                title=r.title,
                description=descs.get(r.slug) or r.description,
                readingMinutes=r.reading_minutes,
            ))

    raw_sections = article.sections or []
    sections = [ArticleSectionSchema(**section) for section in raw_sections if isinstance(section, dict)]

    return ArticleResponse(
        slug=article.slug,
        title=article.title,
        description=article.description,
        readingMinutes=article.reading_minutes,
        sections=sections,
        related=related,
        likesCount=article.likes_count,
        dislikesCount=article.dislikes_count,
        metaTitle=article.meta_title,
        metaDescription=article.meta_description,
        categorySlug=category.slug if category else None,
    )


async def get_navigation(
    db: AsyncSession,
    locale: str | Locale | None = None,
) -> list[NavigationCategory]:
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(KBCategory)
        .where(KBCategory.locale == locale_enum)
        .where(KBCategory.is_active == True)
        .options(selectinload(KBCategory.articles))
        .order_by(KBCategory.order, KBCategory.id)
    )
    categories = result.scalars().unique().all()

    nav: list[NavigationCategory] = []
    for cat in categories:
        entries = [
            NavigationEntry(slug=a.slug, title=a.title)
            for a in cat.articles
            if a.is_active and a.locale == locale_enum
        ]
        nav.append(NavigationCategory(
            slug=cat.slug,
            title=cat.title,
            entries=entries,
        ))
    return nav


async def submit_feedback(
    db: AsyncSession,
    slug: str,
    locale: str | Locale | None = None,
    action: str = "like",
) -> FeedbackResponse:
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.slug == slug.lower().strip())
        .where(KBArticle.locale == locale_enum)
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if action == "like":
        stmt = (
            update(KBArticle)
            .where(KBArticle.id == article.id)
            .values(likes_count=KBArticle.likes_count + 1)
        )
    elif action == "dislike":
        stmt = (
            update(KBArticle)
            .where(KBArticle.id == article.id)
            .values(dislikes_count=KBArticle.dislikes_count + 1)
        )
    elif action == "switch_to_like":
        stmt = (
            update(KBArticle)
            .where(KBArticle.id == article.id)
            .values(
                likes_count=KBArticle.likes_count + 1,
                dislikes_count=case(
                    (KBArticle.dislikes_count > 0, KBArticle.dislikes_count - 1),
                    else_=0,
                ),
            )
        )
    elif action == "switch_to_dislike":
        stmt = (
            update(KBArticle)
            .where(KBArticle.id == article.id)
            .values(
                dislikes_count=KBArticle.dislikes_count + 1,
                likes_count=case(
                    (KBArticle.likes_count > 0, KBArticle.likes_count - 1),
                    else_=0,
                ),
            )
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.execute(stmt)
    await db.flush()
    await db.refresh(article)

    return FeedbackResponse(likes=article.likes_count, dislikes=article.dislikes_count)


# --------------- Admin ---------------

async def create_category(
    db: AsyncSession,
    slug: str,
    title: str,
    locale: str | Locale | None = None,
    order: int = 0,
) -> CategoryResponse:
    locale_enum = coerce_locale(locale)
    category = KBCategory(
        slug=slug.lower().strip(),
        title=title,
        locale=locale_enum,
        order=order,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return CategoryResponse(
        id=category.id,
        slug=category.slug,
        title=category.title,
        locale=category.locale.value,
        order=category.order,
        is_active=category.is_active,
    )


async def update_category(
    db: AsyncSession,
    slug: str,
    title: str | None = None,
    order: int | None = None,
    is_active: bool | None = None,
) -> CategoryResponse:
    result = await db.execute(
        select(KBCategory).where(KBCategory.slug == slug.lower().strip())
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if title is not None:
        category.title = title
    if order is not None:
        category.order = order
    if is_active is not None:
        category.is_active = is_active

    await db.flush()
    await db.refresh(category)
    return CategoryResponse(
        id=category.id,
        slug=category.slug,
        title=category.title,
        locale=category.locale.value,
        order=category.order,
        is_active=category.is_active,
    )


async def delete_category(db: AsyncSession, slug: str) -> bool:
    result = await db.execute(
        select(KBCategory).where(KBCategory.slug == slug.lower().strip())
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.flush()
    return True


async def create_article(
    db: AsyncSession,
    category_slug: str,
    slug: str,
    title: str,
    description: str | None = None,
    locale: str | Locale | None = None,
    reading_minutes: int | None = None,
    sections: list | None = None,
    related_slugs: list | None = None,
    meta_title: str | None = None,
    meta_description: str | None = None,
    order: int = 0,
) -> ArticleCreatedResponse:
    locale_enum = coerce_locale(locale)

    cat_result = await db.execute(
        select(KBCategory).where(KBCategory.slug == category_slug.lower().strip())
    )
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if reading_minutes is None:
        reading_minutes = compute_reading_minutes(sections)

    article = KBArticle(
        category_id=category.id,
        slug=slug.lower().strip(),
        title=title,
        description=description,
        locale=locale_enum,
        reading_minutes=reading_minutes,
        sections=sections or [],
        related_slugs=related_slugs or [],
        meta_title=meta_title,
        meta_description=meta_description,
        order=order,
    )
    db.add(article)
    await db.flush()
    await db.refresh(article)

    return ArticleCreatedResponse(
        id=article.id,
        slug=article.slug,
        title=article.title,
        categorySlug=category.slug,
    )


async def update_article(
    db: AsyncSession,
    slug: str,
    locale: str | Locale | None = None,
    category_slug: str | None = None,
    title: str | None = None,
    description: str | None = None,
    reading_minutes: int | None = None,
    sections: list | None = None,
    related_slugs: list | None = None,
    meta_title: str | None = None,
    meta_description: str | None = None,
    order: int | None = None,
    is_active: bool | None = None,
) -> ArticleUpdatedResponse:
    locale_enum = coerce_locale(locale)

    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.slug == slug.lower().strip())
        .where(KBArticle.locale == locale_enum)
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if category_slug is not None:
        cat_result = await db.execute(
            select(KBCategory).where(KBCategory.slug == category_slug.lower().strip())
        )
        category = cat_result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        article.category_id = category.id

    if title is not None:
        article.title = title
    if description is not None:
        article.description = description
    if sections is not None:
        article.sections = sections
        flag_modified(article, "sections")
        if reading_minutes is None:
            reading_minutes = compute_reading_minutes(sections)
    if reading_minutes is not None:
        article.reading_minutes = reading_minutes
    if related_slugs is not None:
        article.related_slugs = related_slugs
        flag_modified(article, "related_slugs")
    if meta_title is not None:
        article.meta_title = meta_title
    if meta_description is not None:
        article.meta_description = meta_description
    if order is not None:
        article.order = order
    if is_active is not None:
        article.is_active = is_active

    await db.flush()
    await db.refresh(article)

    return ArticleUpdatedResponse(
        id=article.id,
        slug=article.slug,
        title=article.title,
        is_active=article.is_active,
    )


async def delete_article(
    db: AsyncSession,
    slug: str,
    locale: str | Locale | None = None,
) -> bool:
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(KBArticle)
        .where(KBArticle.slug == slug.lower().strip())
        .where(KBArticle.locale == locale_enum)
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)
    await db.flush()
    return True
