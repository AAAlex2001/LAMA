"""
Методы для работы с разделом Tools в хедере
"""
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType, Locale


def coerce_locale(locale: str | Locale | None) -> Locale:
    if locale is None:
        return Locale.RU
    if isinstance(locale, Locale):
        return locale
    if isinstance(locale, str):
        try:
            return Locale[locale.upper()]
        except KeyError:
            return Locale.RU
    return Locale.RU


def _default_response() -> Dict[str, Any]:
    return {"items": []}


def _normalize_ordered_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        order_value = item.get("order")
        try:
            order_int = int(order_value) if order_value is not None else None
        except (TypeError, ValueError):
            order_int = None
        new_item = dict(item)
        if order_int is None:
            new_item.pop("order", None)
        else:
            new_item["order"] = order_int
        new_item["_index"] = index
        normalized.append(new_item)

    normalized.sort(
        key=lambda x: (
            x.get("order") is None,
            x.get("order") if x.get("order") is not None else 0,
            x.get("_index", 0),
        )
    )

    for item in normalized:
        item.pop("_index", None)

    return normalized


async def _get_or_create_header_section(db: AsyncSession) -> LandingSection:
    result = await db.execute(
        select(LandingSection).where(LandingSection.section_type == SectionType.HEADER)
    )
    section = result.scalar_one_or_none()
    if section:
        return section

    section = LandingSection(
        section_type=SectionType.HEADER,
        title="Header Section",
        is_active=True,
        order=0
    )

    try:
        async with db.begin_nested():
            db.add(section)
            await db.flush()
            return section
    except IntegrityError:
        result = await db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.HEADER)
        )
        return result.scalar_one()


async def get_tools_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    locale_enum = coerce_locale(locale)
    section_result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.HEADER)
        .where(LandingSection.is_active == True)
    )
    section = section_result.scalar_one_or_none()

    if not section:
        return _default_response()

    content_result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents: List[LandingContent] = list(content_result.scalars().all())

    response = _default_response()

    for content in contents:
        if content.key == "header_tools_items":
            if content.extra_data and isinstance(content.extra_data.get("items"), list):
                response["items"] = _normalize_ordered_items(content.extra_data.get("items", []))

    return response


async def save_tools_content(
    db: AsyncSession,
    items: List[Dict[str, str]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    locale_enum = coerce_locale(locale)
    section = await _get_or_create_header_section(db)

    await db.execute(
        delete(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.key == "header_tools_items")
    )

    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_tools_items",
            extra_data={"items": items},
            locale=locale_enum,
            is_active=True,
            order=11
        )
    ]

    db.add_all(contents)
    await db.flush()

    return {"status": "ok", "message": "Tools content saved"}
