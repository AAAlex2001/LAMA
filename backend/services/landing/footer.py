"""
Методы для работы с секцией Footer
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType, Locale


def coerce_locale(locale: str | Locale | None) -> Locale:
    """Coerce locale to Locale enum"""
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


async def get_footer_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Footer"""
    locale_enum = coerce_locale(locale)
    section_result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.FOOTER)
        .where(LandingSection.is_active == True)
    )
    section = section_result.scalar_one_or_none()

    if not section:
        return {
            "brandName": "",
            "copyright": "",
            "telegramLink": "",
            "instagramLink": "",
            "columns": []
        }

    content_result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents: List[LandingContent] = list(content_result.scalars().all())

    response: Dict[str, Any] = {
        "brandName": "",
        "copyright": "",
        "telegramLink": "",
        "instagramLink": "",
        "columns": []
    }

    columns: Dict[int, Dict[str, Any]] = {}

    for content in contents:
        if content.key == "footer_brand_name":
            response["brandName"] = content.title or content.text or ""
        elif content.key == "footer_copyright":
            response["copyright"] = content.text or ""
        elif content.key == "footer_telegram_link":
            response["telegramLink"] = content.link_url or ""
        elif content.key == "footer_instagram_link":
            response["instagramLink"] = content.link_url or ""
        elif content.key.startswith("footer_column_"):
            column_index = int(content.key.split("_")[-1])
            if column_index not in columns:
                columns[column_index] = {"title": "", "links": []}
            if content.title:
                columns[column_index]["title"] = content.title
            if content.extra_data and "links" in content.extra_data:
                columns[column_index]["links"] = content.extra_data["links"]

    response["columns"] = [columns[i] for i in sorted(columns.keys())] if columns else []

    return response


async def save_footer_content(
    db: AsyncSession,
    brand_name: str,
    copyright: str,
    telegram_link: str,
    instagram_link: str,
    columns: List[Dict[str, Any]],
    locale: str | Locale | None = None
) -> Dict[str, str]:
    """Сохранить контент для секции Footer"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(
            LandingSection.section_type == SectionType.FOOTER)
    )
    section = result.scalar_one_or_none()

    if not section:
        section = LandingSection(
            section_type=SectionType.FOOTER,
            title="Footer Section",
            is_active=True,
            order=7
        )
        db.add(section)
        await db.flush()

    await db.execute(
        delete(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
    )

    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="footer_brand_name",
            title=brand_name,
            locale=locale_enum,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="footer_copyright",
            text=copyright,
            locale=locale_enum,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="footer_telegram_link",
            link_url=telegram_link,
            locale=locale_enum,
            is_active=True,
            order=3
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="footer_instagram_link",
            link_url=instagram_link,
            locale=locale_enum,
            is_active=True,
            order=4
        )
    ]

    for i, column in enumerate(columns):
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key=f"footer_column_{i}",
            title=column.get("title", ""),
            extra_data={"links": column.get("links", [])},
            locale=locale_enum,
            is_active=True,
            order=10 + i
        ))

    db.add_all(contents)
    await db.commit()

    return {"status": "ok", "message": "Footer content saved"}
