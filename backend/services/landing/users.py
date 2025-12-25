"""
Методы для работы с секцией Users
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


async def get_users_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Users"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.USERS)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        return {
            "number": 500,
            "textLine": "пользователей доверяют",
            "textLine_1": "Планируйте будущее вашего бренда вместе с нами",
            "buttonText": "Начать бесплатно"
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
        "number": 500,
        "textLine": "пользователей доверяют",
        "textLine_1": "Планируйте будущее вашего бренда вместе с нами",
        "buttonText": "Начать бесплатно"
    }
    
    for content in contents:
        if content.key == "users_number":
            try:
                response["number"] = int(content.text or content.title or "500")
            except:
                response["number"] = 500
        elif content.key == "users_text_line":
            response["textLine"] = content.text or content.title or "пользователей доверяют"
        elif content.key == "users_text_line_1":
            response["textLine_1"] = content.text or content.title or "Планируйте будущее вашего бренда вместе с нами"
        elif content.key == "users_button_text":
            response["buttonText"] = content.text or content.title or "Начать бесплатно"
    
    return response


async def save_users_content(
    db: AsyncSession,
    number: int,
    text_line: str,
    text_line_1: str,
    button_text: str,
    locale: str | Locale | None = None
) -> Dict[str, str]:
    """Сохранить контент для секции Users"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(LandingSection.section_type == SectionType.USERS)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        section = LandingSection(
            section_type=SectionType.USERS,
            title="Users Section",
            is_active=True,
            order=5
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
            key="users_number",
            text=str(number),
            locale=locale_enum,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="users_text_line",
            text=text_line,
            locale=locale_enum,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="users_text_line_1",
            text=text_line_1,
            locale=locale_enum,
            is_active=True,
            order=3
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="users_button_text",
            text=button_text,
            locale=locale_enum,
            is_active=True,
            order=4
        )
    ]
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "Users content saved"}

