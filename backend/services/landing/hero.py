"""
Методы для работы с секцией Hero
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


async def get_hero_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Hero"""
    locale_enum = coerce_locale(locale)
    # Получаем секцию Hero (только активную)
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.HERO)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        # Возвращаем дефолтные значения если секции нет
        default_images = [
            {"url": "/hero_1.svg", "alt": "Hero illustration"},
            {"url": "/hero_2.svg", "alt": "Hero illustration"},
            {"url": "/hero_3.svg", "alt": "Hero illustration"},
            {"url": "/hero_4.svg", "alt": "Hero illustration"},
            {"url": "/hero_5.svg", "alt": "Hero illustration"}
        ]
        return {
            "headline": "Управляйте сообществами и ботами Telegram в одном месте",
            "paragraph": "Экономьте время на рутине и увеличивайте охваты с помощью LAMAplanner",
            "paragraphSecondary": "Вы здесь не случайно: нужный сервис перед вами",
            "buttonText": "Начать бесплатно",
            "images": default_images
        }
    
    # Получаем весь контент для этой секции
    result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents = result.scalars().all()
    
    # Формируем ответ из контента
    response = {}
    images = []
    
    for content in contents:
        if content.key == "hero_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key == "hero_paragraph":
            response["paragraph"] = content.text or ""
        elif content.key == "hero_paragraph_secondary":
            response["paragraphSecondary"] = content.text or ""
        elif content.key == "hero_button":
            response["buttonText"] = content.text or "Начать бесплатно"
        elif content.key.startswith("hero_image_"):
            # Картинки с ключами hero_image_1, hero_image_2 и т.д.
            if content.image_url:
                images.append({
                    "url": content.image_url,
                    "alt": content.image_alt or "Hero illustration"
                })
    
    # Дефолтные значения если чего-то не хватает
    default_images = [
        {"url": "/hero_1.svg", "alt": "Hero illustration"},
        {"url": "/hero_2.svg", "alt": "Hero illustration"},
        {"url": "/hero_3.svg", "alt": "Hero illustration"},
        {"url": "/hero_4.svg", "alt": "Hero illustration"},
        {"url": "/hero_5.svg", "alt": "Hero illustration"}
    ]
    
    # Дополняем массив изображений до 5 элементов
    while len(images) < 5:
        images.append({"url": "", "alt": ""})
    
    # Берем только первые 5
    images = images[:5]
    
    return {
        "headline": response.get("headline", "Управляйте сообществами и ботами Telegram в одном месте"),
        "paragraph": response.get("paragraph", "Экономьте время на рутине и увеличивайте охваты с помощью LAMAplanner"),
        "paragraphSecondary": response.get("paragraphSecondary", "Вы здесь не случайно: нужный сервис перед вами"),
        "buttonText": response.get("buttonText", "Начать бесплатно"),
        "images": images if images else default_images
    }


async def save_hero_content(
    db: AsyncSession,
    headline: str,
    paragraph: str,
    paragraph_secondary: str,
    button_text: str,
    images: List[Dict[str, str]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    """Сохранить контент для секции Hero"""
    locale_enum = coerce_locale(locale)
    # Получаем или создаем секцию Hero
    result = await db.execute(
        select(LandingSection).where(LandingSection.section_type == SectionType.HERO)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        section = LandingSection(
            section_type=SectionType.HERO,
            title="Hero Section",
            is_active=True,
            order=0
        )
        db.add(section)
        await db.flush()
    
    # Удаляем старый контент только для текущей локали
    await db.execute(
        delete(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
    )
    
    # Создаем новый контент
    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="hero_headline",
            title=headline,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="hero_paragraph",
            text=paragraph,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="hero_paragraph_secondary",
            text=paragraph_secondary,
            is_active=True,
            order=3
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="hero_button",
            text=button_text,
            is_active=True,
            order=4
        )
    ]
    
    # Добавляем картинки
    for i, image in enumerate(images):
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.IMAGE,
            locale=locale_enum,
            key=f"hero_image_{i + 1}",
            image_url=image.get("url", ""),
            image_alt=image.get("alt", "Hero illustration"),
            is_active=True,
            order=10 + i
        ))
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "Hero content saved"}

