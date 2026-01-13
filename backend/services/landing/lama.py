"""
Методы для работы с секцией Lama
"""
from typing import Dict, Any
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


async def get_lama_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Lama"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.LAMA)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()

    if not section:
        return {
            "headline": "",
            "channel": "",
            "description": "",
            "buttonText": "",
            "buttonHref": ""
        }

    result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents = result.scalars().all()

    response = {
        "headline": "",
        "channel": "",
        "description": "",
        "buttonText": "",
        "buttonHref": ""
    }

    for content in contents:
        if content.key == "lama_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key == "lama_channel":
            response["channel"] = content.text or content.title or ""
        elif content.key == "lama_description":
            response["description"] = content.text or ""
        elif content.key == "lama_button_text":
            response["buttonText"] = content.text or content.title or ""
        elif content.key == "lama_button_href":
            response["buttonHref"] = content.link_url or ""

    return response


async def save_lama_content(
    db: AsyncSession,
    headline: str,
    channel: str,
    description: str,
    button_text: str,
    button_href: str,
    locale: str | Locale | None = None
) -> Dict[str, str]:
    """Сохранить контент для секции Lama"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(
            LandingSection.section_type == SectionType.LAMA)
    )
    section = result.scalar_one_or_none()

    if not section:
        section = LandingSection(
            section_type=SectionType.LAMA,
            title="Lama Section",
            is_active=True,
            order=6
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
            key="lama_headline",
            title=headline,
            locale=locale_enum,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="lama_channel",
            text=channel,
            locale=locale_enum,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="lama_description",
            text=description,
            locale=locale_enum,
            is_active=True,
            order=3
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="lama_button_text",
            text=button_text,
            locale=locale_enum,
            is_active=True,
            order=4
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="lama_button_href",
            link_url=button_href,
            locale=locale_enum,
            is_active=True,
            order=5
        )
    ]

    db.add_all(contents)
    await db.commit()

    return {"status": "ok", "message": "Lama content saved"}
