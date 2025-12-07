"""
Методы для работы с секцией FAQ
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType


async def get_faq_content(db: AsyncSession) -> Dict[str, Any]:
    """Получить контент для секции FAQ"""
    result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.FAQ)
        .where(LandingSection.is_active == True)
    )
    section = result.scalar_one_or_none()
    
    if not section:
        return {
            "headline": "Часто задаваемые вопросы",
            "faqItems": [
                {
                    "question": "Можно ли использовать Lama Planner бесплатно?",
                    "answer": "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
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
    
    response = {}
    faq_items = []
    
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
    
    return {
        "headline": response.get("headline", "Часто задаваемые вопросы"),
        "faqItems": faq_items if faq_items else []
    }


async def save_faq_content(
    db: AsyncSession,
    headline: str,
    faq_items: List[Dict[str, Any]]
) -> Dict[str, str]:
    """Сохранить контент для секции FAQ"""
    result = await db.execute(
        select(LandingSection).where(LandingSection.section_type == SectionType.FAQ)
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
        delete(LandingContent).where(LandingContent.section_id == section.id)
    )
    
    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="faq_headline",
            title=headline,
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
            is_active=True,
            order=10 + i
        ))
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "FAQ content saved"}

