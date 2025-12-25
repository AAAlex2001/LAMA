"""
Методы для работы с секцией Advantages
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


async def get_advantages_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Advantages"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.ADVANTAGES)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        return {
            "headline": "Всё для продуктивной и лёгкой работы с контентом",
            "subtitle": "Профессиональный инструмент для тех, кто ценит порядок и эффективность",
            "cards": [
                {"title": "Создавайте ботов", "description": "Подключай ботов по токену @BotFather и управляй ими. Приветственные боты и боты обратной связи легко и быстро настраиваются", "isCta": False, "linkText": None},
                {"title": "Дополнительная функция 1", "description": "Описание дополнительной функции 1", "isCta": False, "linkText": None},
                {"title": "cta", "description": "Сомнения позади: вы на пути к верному решению!", "isCta": True, "linkText": None},
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
    cards = []
    
    for content in contents:
        if content.key == "advantages_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key == "advantages_subtitle":
            response["subtitle"] = content.text or ""
        elif content.key.startswith("advantages_card_"):
            card_index = int(content.key.split("_")[-1])
            while len(cards) <= card_index:
                cards.append({"title": "", "description": "", "isCta": False, "linkText": None})
            
            if content.title:
                cards[card_index]["title"] = content.title
            if content.text:
                cards[card_index]["description"] = content.text
            if content.link_text:
                cards[card_index]["linkText"] = content.link_text
            # isCta храним в extra_data или как отдельное поле
            if content.extra_data and content.extra_data.get("isCta"):
                cards[card_index]["isCta"] = True
    
    return {
        "headline": response.get("headline", "Всё для продуктивной и лёгкой работы с контентом"),
        "subtitle": response.get("subtitle", "Профессиональный инструмент для тех, кто ценит порядок и эффективность"),
        "cards": cards if cards else []
    }


async def save_advantages_content(
    db: AsyncSession,
    headline: str,
    subtitle: str,
    cards: List[Dict[str, Any]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    """Сохранить контент для секции Advantages"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(LandingSection.section_type == SectionType.ADVANTAGES)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        section = LandingSection(
            section_type=SectionType.ADVANTAGES,
            title="Advantages Section",
            is_active=True,
            order=1
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
            key="advantages_headline",
            title=headline,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="advantages_subtitle",
            text=subtitle,
            is_active=True,
            order=2
        )
    ]
    
    for i, card in enumerate(cards):
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"advantages_card_{i}",
            title=card.get("title", ""),
            text=card.get("description", ""),
            link_text=card.get("linkText"),
            extra_data={"isCta": card.get("isCta", False)} if card.get("isCta", False) else {},
            is_active=True,
            order=10 + i
        ))
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "Advantages content saved"}

