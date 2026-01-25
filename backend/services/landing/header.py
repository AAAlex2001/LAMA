"""
Методы для работы с секцией Header
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
    return {
        "brandPrefix": "",
        "brandSuffix": "",
        "toolsLabel": "",
        "toolsOrder": None,
        "loginText": "",
        "loginHref": "",
        "registerText": "",
        "registerHref": "",
        "telegramText": "",
        "telegramHref": "",
        "navLinks": [],
    }


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
    db.add(section)

    try:
        await db.flush()
        return section
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.HEADER)
        )
        return result.scalar_one()


async def get_header_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
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
        if content.key == "header_brand_prefix":
            response["brandPrefix"] = content.title or content.text or ""
        elif content.key == "header_brand_suffix":
            response["brandSuffix"] = content.title or content.text or ""
        elif content.key == "header_tools_label":
            response["toolsLabel"] = content.text or ""
        elif content.key == "header_tools_order":
            try:
                response["toolsOrder"] = int(content.text) if content.text is not None else None
            except (TypeError, ValueError):
                response["toolsOrder"] = None
        elif content.key == "header_login_text":
            response["loginText"] = content.text or ""
        elif content.key == "header_login_href":
            response["loginHref"] = content.link_url or content.text or ""
        elif content.key == "header_register_text":
            response["registerText"] = content.text or ""
        elif content.key == "header_register_href":
            response["registerHref"] = content.link_url or content.text or ""
        elif content.key == "header_telegram_text":
            response["telegramText"] = content.text or ""
        elif content.key == "header_telegram_href":
            response["telegramHref"] = content.link_url or content.text or ""
        elif content.key == "header_nav_links":
            if content.extra_data and isinstance(content.extra_data.get("links"), list):
                response["navLinks"] = _normalize_ordered_items(content.extra_data.get("links", []))

    return response


async def save_header_content(
    db: AsyncSession,
    brand_prefix: str,
    brand_suffix: str,
    tools_label: str,
    tools_order: int | None,
    login_text: str,
    login_href: str,
    register_text: str,
    register_href: str,
    telegram_text: str,
    telegram_href: str,
    nav_links: List[Dict[str, str]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    locale_enum = coerce_locale(locale)
    section = await _get_or_create_header_section(db)

    await db.execute(
        delete(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
    )

    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_brand_prefix",
            title=brand_prefix,
            locale=locale_enum,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_brand_suffix",
            title=brand_suffix,
            locale=locale_enum,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_tools_label",
            text=tools_label,
            locale=locale_enum,
            is_active=True,
            order=3
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_tools_order",
            text=str(tools_order) if tools_order is not None else None,
            locale=locale_enum,
            is_active=True,
            order=4
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_login_text",
            text=login_text,
            locale=locale_enum,
            is_active=True,
            order=5
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="header_login_href",
            link_url=login_href,
            text=login_href,
            locale=locale_enum,
            is_active=True,
            order=6
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_register_text",
            text=register_text,
            locale=locale_enum,
            is_active=True,
            order=7
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="header_register_href",
            link_url=register_href,
            text=register_href,
            locale=locale_enum,
            is_active=True,
            order=8
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_telegram_text",
            text=telegram_text,
            locale=locale_enum,
            is_active=True,
            order=9
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="header_telegram_href",
            link_url=telegram_href,
            text=telegram_href,
            locale=locale_enum,
            is_active=True,
            order=10
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="header_nav_links",
            extra_data={"links": nav_links},
            locale=locale_enum,
            is_active=True,
            order=11
        )
    ]

    db.add_all(contents)
    await db.commit()

    return {"status": "ok", "message": "Header content saved"}
