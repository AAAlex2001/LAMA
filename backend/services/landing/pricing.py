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
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.PRICING)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        return {
            "headline": "Выберите свой план",
            "subtitle": "Решение для любого масштаба проектов",
            "description": "От личного блога до крупного проекта — управляйте контентом эффективно и выгодно",
            "plans": [
                {
                    "title": "Пробный",
                    "price": "0 ₽/сутки",
                    "features": ["Тестируйте все функции 24 часа"],
                    "isHighlighted": False
                },
                {
                    "title": "Базовый",
                    "price": "890 ₽/месяц",
                    "features": [
                        "Доступен полный функционал сервиса",
                        "Подключение до 5 каналов / чатов",
                        "Создание и управление 5 ботами",
                        "Подключение до 3 RSS-лент / репостеров"
                    ],
                    "isHighlighted": True
                },
                {
                    "title": "Профессиональный",
                    "price": "1590 ₽/месяц",
                    "features": [
                        "Доступен полный функционал сервиса",
                        "Подключение до 15 каналов / чатов",
                        "Создание и управление 15 ботами",
                        "Подключение до 7 RSS-лент / репостеров"
                    ],
                    "isHighlighted": False
                }
            ]
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
    plans = []
    
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
                plans.append({"title": "", "price": "", "features": [], "isHighlighted": False})
            
            if content.title:
                plans[plan_index]["title"] = content.title
            if content.text:
                plans[plan_index]["price"] = content.text
            if content.extra_data:
                if "features" in content.extra_data:
                    plans[plan_index]["features"] = content.extra_data["features"]
                if "isHighlighted" in content.extra_data:
                    plans[plan_index]["isHighlighted"] = content.extra_data["isHighlighted"]
    
    return {
        "headline": response.get("headline", "Выберите свой план"),
        "subtitle": response.get("subtitle", "Решение для любого масштаба проектов"),
        "description": response.get("description", "От личного блога до крупного проекта — управляйте контентом эффективно и выгодно"),
        "plans": plans if plans else []
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
        select(LandingSection).where(LandingSection.section_type == SectionType.PRICING)
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
        
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"pricing_plan_{i}",
            title=plan.get("title", ""),
            text=plan.get("price", ""),
            extra_data={
                "features": features,
                "isHighlighted": is_highlighted
            },
            is_active=True,
            order=10 + i
        ))
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "Pricing content saved"}

