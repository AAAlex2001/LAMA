"""
Роуты для получения и сохранения контента лендинга
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.landing import hero, advantages, key_advantages, pricing, faq, users, lama, footer
from backend.schemas.landing import (
    HeroContentRequest,
    AdvantagesContentRequest,
    KeyAdvantagesContentRequest,
    PricingContentRequest,
    FAQContentRequest,
    UsersContentRequest,
    LamaContentRequest,
    FooterContentRequest
)

router = APIRouter()


@router.get("/hero")
async def get_hero_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Hero"""
    return await hero.get_hero_content(db)


@router.put("/hero")
async def save_hero_content(data: HeroContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Hero"""
    images = [{"url": img.url, "alt": img.alt} for img in data.images]
    return await hero.save_hero_content(
        db,
        headline=data.headline,
        paragraph=data.paragraph,
        paragraph_secondary=data.paragraphSecondary,
        button_text=data.buttonText,
        images=images
    )


@router.get("/advantages")
async def get_advantages_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Advantages"""
    return await advantages.get_advantages_content(db)


@router.put("/advantages")
async def save_advantages_content(data: AdvantagesContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Advantages"""
    cards = [
        {
            "title": card.title,
            "description": card.description,
            "isCta": card.isCta,
            "linkText": card.linkText
        }
        for card in data.cards
    ]
    return await advantages.save_advantages_content(
        db,
        headline=data.headline,
        subtitle=data.subtitle,
        cards=cards
    )


@router.get("/key-advantages")
async def get_key_advantages_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Key Advantages"""
    return await key_advantages.get_key_advantages_content(db)


@router.put("/key-advantages")
async def save_key_advantages_content(data: KeyAdvantagesContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Key Advantages"""
    advantages_list = [
        {
            "icon": advantage.icon,
            "title": advantage.title,
            "description": advantage.description
        }
        for advantage in data.advantages
    ]
    return await key_advantages.save_key_advantages_content(
        db,
        headline=data.headline,
        advantages=advantages_list
    )


@router.get("/pricing")
async def get_pricing_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Pricing"""
    return await pricing.get_pricing_content(db)


@router.put("/pricing")
async def save_pricing_content(data: PricingContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Pricing"""
    plans = [
        {
            "title": plan.title,
            "price": plan.price,
            "features": plan.features,
            "isHighlighted": plan.isHighlighted
        }
        for plan in data.plans
    ]
    return await pricing.save_pricing_content(
        db,
        headline=data.headline,
        subtitle=data.subtitle,
        description=data.description,
        plans=plans
    )


@router.get("/faq")
async def get_faq_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции FAQ"""
    return await faq.get_faq_content(db)


@router.put("/faq")
async def save_faq_content(data: FAQContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции FAQ"""
    faq_items = [
        {
            "question": item.question,
            "answer": item.answer
        }
        for item in data.faqItems
    ]
    return await faq.save_faq_content(
        db,
        headline=data.headline,
        faq_items=faq_items
    )


@router.get("/users")
async def get_users_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Users"""
    return await users.get_users_content(db)


@router.put("/users")
async def save_users_content(data: UsersContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Users"""
    return await users.save_users_content(
        db,
        number=data.number,
        text_line=data.textLine,
        text_line_1=data.textLine_1,
        button_text=data.buttonText
    )


@router.get("/lama")
async def get_lama_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Lama"""
    return await lama.get_lama_content(db)


@router.put("/lama")
async def save_lama_content(data: LamaContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Lama"""
    return await lama.save_lama_content(
        db,
        headline=data.headline,
        channel=data.channel,
        description=data.description,
        button_text=data.buttonText,
        button_href=data.buttonHref
    )


@router.get("/footer")
async def get_footer_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Footer"""
    return await footer.get_footer_content(db)


@router.put("/footer")
async def save_footer_content(data: FooterContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Footer"""
    columns = [
        {
            "title": column.title,
            "links": [{"text": link.text, "href": link.href} for link in column.links]
        }
        for column in data.columns
    ]
    return await footer.save_footer_content(
        db,
        brand_name=data.brandName,
        copyright=data.copyright,
        telegram_link=data.telegramLink,
        instagram_link=data.instagramLink,
        columns=columns
    )

