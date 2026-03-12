"""
Методы для работы с секцией Key Advantages
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType, Locale


def coerce_locale(locale: str | Locale | None) -> Locale:
    if isinstance(locale, Locale):
        return locale
    if isinstance(locale, str) and locale in Locale.__members__:
        return Locale[locale]
    return Locale.RU


async def get_key_advantages_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Key Advantages"""
    locale_enum = coerce_locale(locale)
    section_result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.KEY_ADVANTAGES)
        .where(LandingSection.is_active == True)
    )
    section = section_result.scalar_one_or_none()

    if not section:
        return {
            "headline": "",
            "advantages": []
        }

    content_result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents: List[LandingContent] = list(content_result.scalars().all())

    response: Dict[str, Any] = {}
    advantages: List[Dict[str, Any]] = []

    for content in contents:
        if content.key == "key_advantages_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key.startswith("key_advantage_"):
            advantage_index = int(content.key.split("_")[-1])
            while len(advantages) <= advantage_index:
                advantages.append(
                    {"icon": None, "title": "", "description": ""})

            if content.image_url:
                advantages[advantage_index]["icon"] = content.image_url
            elif content.extra_data and content.extra_data.get("icon"):
                advantages[advantage_index]["icon"] = content.extra_data["icon"]
            if content.title:
                advantages[advantage_index]["title"] = content.title
            if content.text:
                advantages[advantage_index]["description"] = content.text

    return {
        "headline": response.get("headline", ""),
        "advantages": advantages
    }


async def save_key_advantages_content(
    db: AsyncSession,
    headline: str,
    advantages: List[Dict[str, Any]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    """Сохранить контент для секции Key Advantages"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(
            LandingSection.section_type == SectionType.KEY_ADVANTAGES)
    )
    section = result.scalar_one_or_none()

    if not section:
        section = LandingSection(
            section_type=SectionType.KEY_ADVANTAGES,
            title="Key Advantages Section",
            is_active=True,
            order=2
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
            locale=locale_enum,
            key="key_advantages_headline",
            title=headline,
            is_active=True,
            order=1
        )
    ]

    for i, advantage in enumerate(advantages):
        extra_data = {}
        icon = advantage.get("icon")
        if icon and not icon.startswith("http") and not icon.startswith("/"):
            # Если это SVG текст, сохраняем в extra_data
            extra_data["icon"] = icon

        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"key_advantage_{i}",
            title=advantage.get("title", ""),
            text=advantage.get("description", ""),
            image_url=icon if icon and (icon.startswith(
                "http") or icon.startswith("/")) else None,
            extra_data=extra_data if extra_data else {},
            is_active=True,
            order=10 + i
        ))

    db.add_all(contents)
    await db.flush()

    return {"status": "ok", "message": "Key Advantages content saved"}
