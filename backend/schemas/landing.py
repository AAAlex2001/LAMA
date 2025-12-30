"""
Схемы для работы с контентом лендинга
"""
from typing import List, Optional
from pydantic import BaseModel


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
    linkUrl: Optional[str] = None


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
    primaryButtonText: Optional[str] = None
    primaryButtonLink: Optional[str] = None
    secondaryButtonText: Optional[str] = None
    secondaryButtonLink: Optional[str] = None
    helpText: Optional[str] = None
    botLink: Optional[str] = None


class UsersContentRequest(BaseModel):
    number: int
    textLine: str
    textLine_1: str
    buttonText: str


class LamaContentRequest(BaseModel):
    headline: str
    channel: str
    description: str
    buttonText: str
    buttonHref: str


class FooterLink(BaseModel):
    text: str
    href: str


class FooterColumn(BaseModel):
    title: str
    links: List[FooterLink]


class FooterContentRequest(BaseModel):
    brandName: str
    copyright: str
    telegramLink: str
    instagramLink: str
    columns: List[FooterColumn]

