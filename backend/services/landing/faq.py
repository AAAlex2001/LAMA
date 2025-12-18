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
            ],
            "primaryButtonText": "База знаний",
            "primaryButtonLink": "/knowledge-base",
            "secondaryButtonText": "Telegram канал",
            "secondaryButtonLink": "/telegram-channel",
            "helpText": "Не нашли ответ? Напишите нам в @LamaPlannerBot",
            "botLink": "https://t.me/LamaPlannerBot"
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
        "headline": response.get("headline", "Часто задаваемые вопросы"),
        "faqItems": faq_items if faq_items else [],
        "primaryButtonText": response.get("primaryButtonText", "База знаний"),
        "primaryButtonLink": response.get("primaryButtonLink", "/knowledge-base"),
        "secondaryButtonText": response.get("secondaryButtonText", "Telegram канал"),
        "secondaryButtonLink": response.get("secondaryButtonLink", "/telegram-channel"),
        "helpText": response.get("helpText", "Не нашли ответ? Напишите нам в @LamaPlannerBot"),
        "botLink": response.get("botLink", "https://t.me/LamaPlannerBot")
    }


async def save_faq_content(
    db: AsyncSession,
    headline: str,
    faq_items: List[Dict[str, Any]],
    primary_button_text: str = None,
    primary_button_link: str = None,
    secondary_button_text: str = None,
    secondary_button_link: str = None,
    help_text: str = None,
    bot_link: str = None
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
    
    # Кнопки и подпись
    if primary_button_text or primary_button_link:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="faq_primary_button",
            link_text=primary_button_text or "",
            link_url=primary_button_link or "",
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
            is_active=True,
            order=1001
        ))
    
    if help_text:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            key="faq_help_text",
            text=help_text,
            is_active=True,
            order=1002
        ))
    
    if bot_link:
        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.LINK,
            key="faq_bot_link",
            link_url=bot_link,
            is_active=True,
            order=1003
        ))
    
    db.add_all(contents)
    await db.commit()
    
    return {"status": "ok", "message": "FAQ content saved"}

