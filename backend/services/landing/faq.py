"""
Методы для работы с секцией FAQ
"""
from typing import List, Dict, Any, Optional
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


async def get_faq_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции FAQ"""
    locale_enum = coerce_locale(locale)
    section_result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.FAQ)
        .where(LandingSection.is_active == True)
    )
    section = section_result.scalar_one_or_none()

    if not section:
        return {
            "headline": "",
            "faqItems": [],
            "primaryButtonText": "",
            "primaryButtonLink": "",
            "secondaryButtonText": "",
            "secondaryButtonLink": "",
            "helpText": "",
            "botLink": ""
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
    faq_items: List[Dict[str, str]] = []

    for content in contents:
        if content.key == "faq_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key.startswith("faq_item_"):
            item_index = int(content.key.split("_")[-1])
            while len(faq_items) <= item_index:
                faq_items.append({"question": "", "answer": ""})

            if content.title:
                faq_items[item_index]["question"] = content.title
            if content.text:
                faq_items[item_index]["answer"] = content.text
        elif content.key == "faq_primary_button":
            response["primaryButtonText"] = content.link_text or ""
            response["primaryButtonLink"] = content.link_url or ""
        elif content.key == "faq_secondary_button":
            response["secondaryButtonText"] = content.link_text or ""
            response["secondaryButtonLink"] = content.link_url or ""
        elif content.key == "faq_help_text":
            response["helpText"] = content.text or ""
        elif content.key == "faq_bot_link":
            response["botLink"] = content.link_url or ""

    return {
        "headline": response.get("headline", ""),
        "faqItems": faq_items,
        "primaryButtonText": response.get("primaryButtonText", ""),
        "primaryButtonLink": response.get("primaryButtonLink", ""),
        "secondaryButtonText": response.get("secondaryButtonText", ""),
        "secondaryButtonLink": response.get("secondaryButtonLink", ""),
        "helpText": response.get("helpText", ""),
        "botLink": response.get("botLink", "")
    }


async def save_faq_content(
    db: AsyncSession,
    headline: str,
    faq_items: List[Dict[str, Any]],
    primary_button_text: Optional[str] = None,
    primary_button_link: Optional[str] = None,
    secondary_button_text: Optional[str] = None,
    secondary_button_link: Optional[str] = None,
    help_text: Optional[str] = None,
    bot_link: Optional[str] = None,
    locale: str | Locale | None = None
) -> Dict[str, str]:
    """Сохранить контент для секции FAQ"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(
            LandingSection.section_type == SectionType.FAQ)
    )
    section = result.scalar_one_or_none()

    if not section:
        section = LandingSection(
            section_type=SectionType.FAQ,
            title="FAQ Section",
            is_active=True,
            order=4
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
            key="faq_headline",
            title=headline,
            locale=locale_enum,
            is_active=True,
            order=1
        )
    ]

    for i, item in enumerate(faq_items):
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key=f"faq_item_{i}",
            title=item.get("question", ""),
            text=item.get("answer", ""),
            locale=locale_enum,
            is_active=True,
            order=10 + i
        ))

    # Кнопки и подпись
    if primary_button_text or primary_button_link:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="faq_primary_button",
            link_text=primary_button_text or "",
            link_url=primary_button_link or "",
            locale=locale_enum,
            is_active=True,
            order=1000
        ))

    if secondary_button_text or secondary_button_link:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="faq_secondary_button",
            link_text=secondary_button_text or "",
            link_url=secondary_button_link or "",
            locale=locale_enum,
            is_active=True,
            order=1001
        ))

    if help_text:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="faq_help_text",
            text=help_text,
            locale=locale_enum,
            is_active=True,
            order=1002
        ))

    if bot_link:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="faq_bot_link",
            link_url=bot_link,
            locale=locale_enum,
            is_active=True,
            order=1003
        ))

    db.add_all(contents)
    await db.commit()

    return {"status": "ok", "message": "FAQ content saved"}
