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

