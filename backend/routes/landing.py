"""
Роуты для получения и сохранения контента лендинга
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.landing import LandingService

router = APIRouter()


class HeroImage(BaseModel):
    url: str
    alt: str = "Hero illustration"


class HeroContentRequest(BaseModel):
    headline: str
    paragraph: str
    paragraphSecondary: str
    buttonText: str
    images: List[HeroImage]


class AdvantagesCard(BaseModel):
    title: str
    description: str
    isCta: bool = False
    linkText: Optional[str] = None


class AdvantagesContentRequest(BaseModel):
    headline: str
    subtitle: str
    cards: List[AdvantagesCard]


class KeyAdvantageItem(BaseModel):
    icon: Optional[str] = None  # SVG как текст или ссылка
    title: str
    description: str


class KeyAdvantagesContentRequest(BaseModel):
    headline: str
    advantages: List[KeyAdvantageItem]


class PricingPlan(BaseModel):
    title: str
    price: str
    features: List[str]
    isHighlighted: bool = False


class PricingContentRequest(BaseModel):
    headline: str
    subtitle: str
    description: str
    plans: List[PricingPlan]


class FAQItem(BaseModel):
    question: str
    answer: str


class FAQContentRequest(BaseModel):
    headline: str
    faqItems: List[FAQItem]


@router.get("/hero")
async def get_hero_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Hero"""
    service = LandingService(db)
    return await service.get_hero_content()


@router.put("/hero")
async def save_hero_content(data: HeroContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Hero"""
    service = LandingService(db)
    images = [{"url": img.url, "alt": img.alt} for img in data.images]
    return await service.save_hero_content(
        headline=data.headline,
        paragraph=data.paragraph,
        paragraph_secondary=data.paragraphSecondary,
        button_text=data.buttonText,
        images=images
    )


@router.get("/advantages")
async def get_advantages_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Advantages"""
    service = LandingService(db)
    return await service.get_advantages_content()


@router.put("/advantages")
async def save_advantages_content(data: AdvantagesContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Advantages"""
    service = LandingService(db)
    cards = [
        {
            "title": card.title,
            "description": card.description,
            "isCta": card.isCta,
            "linkText": card.linkText
        }
        for card in data.cards
    ]
    return await service.save_advantages_content(
        headline=data.headline,
        subtitle=data.subtitle,
        cards=cards
    )


@router.get("/key-advantages")
async def get_key_advantages_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Key Advantages"""
    service = LandingService(db)
    return await service.get_key_advantages_content()


@router.put("/key-advantages")
async def save_key_advantages_content(data: KeyAdvantagesContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Key Advantages"""
    service = LandingService(db)
    advantages = [
        {
            "icon": advantage.icon,
            "title": advantage.title,
            "description": advantage.description
        }
        for advantage in data.advantages
    ]
    return await service.save_key_advantages_content(
        headline=data.headline,
        advantages=advantages
    )


@router.get("/pricing")
async def get_pricing_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции Pricing"""
    service = LandingService(db)
    return await service.get_pricing_content()


@router.put("/pricing")
async def save_pricing_content(data: PricingContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции Pricing"""
    service = LandingService(db)
    plans = [
        {
            "title": plan.title,
            "price": plan.price,
            "features": plan.features,
            "isHighlighted": plan.isHighlighted
        }
        for plan in data.plans
    ]
    return await service.save_pricing_content(
        headline=data.headline,
        subtitle=data.subtitle,
        description=data.description,
        plans=plans
    )


@router.get("/faq")
async def get_faq_content(db: AsyncSession = Depends(get_db)):
    """Получить контент для секции FAQ"""
    service = LandingService(db)
    return await service.get_faq_content()


@router.put("/faq")
async def save_faq_content(data: FAQContentRequest, db: AsyncSession = Depends(get_db)):
    """Сохранить контент для секции FAQ"""
    service = LandingService(db)
    faq_items = [
        {
            "question": item.question,
            "answer": item.answer
        }
        for item in data.faqItems
    ]
    return await service.save_faq_content(
        headline=data.headline,
        faq_items=faq_items
    )

