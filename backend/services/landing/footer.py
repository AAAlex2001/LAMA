"""
Методы для работы с секцией Footer
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType


async def get_footer_content(db: AsyncSession) -> Dict[str, Any]:
    """Получить контент для секции Footer"""
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.FOOTER)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        return {
            "brandName": "LAMAplanner",
            "copyright": "© 2025 LamaPlanner. Все права защищены.",
            "telegramLink": "/telegram",
            "instagramLink": "/instagram",
            "columns": [
                {
                    "title": "Продукт",
                    "links": [
                        {"text": "Функции", "href": "/features"},
                        {"text": "Тарифы", "href": "/pricing"},
                        {"text": "Обновления", "href": "/updates"}
                    ]
                },
                {
                    "title": "Поддержка",
                    "links": [
                        {"text": "FAQ", "href": "/faq"},
                        {"text": "База знаний", "href": "/knowledge-base"},
                        {"text": "Связаться с нами", "href": "/contact"},
                        {"text": "Сообщить об ошибке", "href": "/report-error"}
                    ]
                },
                {
                    "title": "Юридическое",
                    "links": [
                        {"text": "Пользовательское соглашение", "href": "/terms"},
                        {"text": "Политика конфиденциальности", "href": "/privacy"}
                    ]
                },
                {
                    "title": "Контакты",
                    "links": [
                        {"text": "Телефон", "href": "tel:+1234567890"},
                        {"text": "Электронная почта", "href": "mailto:info@lamaplanner.com"},
                        {"text": "Telegram", "href": "/telegram"}
                    ]
                }
            ]
        }
    
    result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents = result.scalars().all()
    
    response = {
        "brandName": "LAMAplanner",
        "copyright": "© 2025 LamaPlanner. Все права защищены.",
        "telegramLink": "/telegram",
        "instagramLink": "/instagram",
        "columns": []
    }
    
    columns = {}
    
    for content in contents:
        if content.key == "footer_brand_name":
            response["brandName"] = content.title or content.text or "LAMAplanner"
        elif content.key == "footer_copyright":
            response["copyright"] = content.text or "© 2025 LamaPlanner. Все права защищены."
        elif content.key == "footer_telegram_link":
            response["telegramLink"] = content.link_url or "/telegram"
        elif content.key == "footer_instagram_link":
            response["instagramLink"] = content.link_url or "/instagram"
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
    columns: List[Dict[str, Any]]
) -> Dict[str, str]:
    """Сохранить контент для секции Footer"""
    result = await db.execute(
        select(LandingSection).where(LandingSection.section_type == SectionType.FOOTER)
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
        delete(LandingContent).where(LandingContent.section_id == section.id)
    )
    
    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="footer_brand_name",
            title=brand_name,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="footer_copyright",
            text=copyright,
            is_active=True,
            order=2
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="footer_telegram_link",
            link_url=telegram_link,
            is_active=True,
            order=3
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="footer_instagram_link",
            link_url=instagram_link,
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
            is_active=True,
            order=10 + i
        ))
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "Footer content saved"}

