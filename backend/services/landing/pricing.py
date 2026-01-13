"""
Методы для работы с секцией Pricing
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


async def get_pricing_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Pricing"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.PRICING)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()

    if not section:
        return {
            "headline": "",
            "subtitle": "",
            "description": "",
            "plans": []
        }

    result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents = result.scalars().all()

    response = {}
    plans: list[dict[str, Any]] = []

    for content in contents:
        if content.key == "pricing_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key == "pricing_subtitle":
            response["subtitle"] = content.title or content.text or ""
        elif content.key == "pricing_description":
            response["description"] = content.text or ""
        elif content.key.startswith("pricing_plan_"):
            plan_index = int(content.key.split("_")[-1])
            while len(plans) <= plan_index:
                plans.append({"title": "", "price": "", "features": [
                             ], "isHighlighted": False, "buttonText": "", "buttonUrl": ""})

            if content.title:
                plans[plan_index]["title"] = content.title
            if content.text:
                plans[plan_index]["price"] = content.text
            if content.extra_data:
                if "features" in content.extra_data:
                    plans[plan_index]["features"] = content.extra_data["features"]
                if "isHighlighted" in content.extra_data:
                    plans[plan_index]["isHighlighted"] = content.extra_data["isHighlighted"]
                if "buttonText" in content.extra_data:
                    plans[plan_index]["buttonText"] = content.extra_data["buttonText"]
                if "buttonUrl" in content.extra_data:
                    plans[plan_index]["buttonUrl"] = content.extra_data["buttonUrl"]

    return {
        "headline": response.get("headline", ""),
        "subtitle": response.get("subtitle", ""),
        "description": response.get("description", ""),
        "plans": plans
    }


async def save_pricing_content(
    db: AsyncSession,
    headline: str,
    subtitle: str,
    description: str,
    plans: List[Dict[str, Any]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    """Сохранить контент для секции Pricing"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(
            LandingSection.section_type == SectionType.PRICING)
    )
    section = result.scalar_one_or_none()

    if not section:
        section = LandingSection(
            section_type=SectionType.PRICING,
            title="Pricing Section",
            is_active=True,
            order=3
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
            key="pricing_headline",
            title=headline,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="pricing_subtitle",
            title=subtitle,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="pricing_description",
            text=description,
            is_active=True,
            order=3
        )
    ]

    for i, plan in enumerate(plans):
        # Сохраняем features в extra_data
        features = plan.get("features", [])
        is_highlighted = plan.get("isHighlighted", False)
        button_text = plan.get("buttonText", "")
        button_url = plan.get("buttonUrl", "")

        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"pricing_plan_{i}",
            title=plan.get("title", ""),
            text=plan.get("price", ""),
            extra_data={
                "features": features,
                "isHighlighted": is_highlighted,
                "buttonText": button_text,
                "buttonUrl": button_url
            },
            is_active=True,
            order=10 + i
        ))

    db.add_all(contents)
    await db.commit()

    return {"status": "ok", "message": "Pricing content saved"}
