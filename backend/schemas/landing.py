"""Схемы для PUT-запросов лендинга. Каждая секция (Hero, FAQ, Pricing, ...) — отдельная группа схем."""
from typing import List, Optional
from pydantic import BaseModel


# ──────────────────────────────────────────────────────────────────────
# Hero
# ──────────────────────────────────────────────────────────────────────


class HeroImage(BaseModel):
    url: str
    alt: str = "Hero illustration"


class HeroContentRequest(BaseModel):
    headline: str
    paragraph: str
    paragraphSecondary: str
    buttonText: str
    buttonUrl: str = ""
    images: List[HeroImage]
    templateImages: Optional[List[HeroImage]] = None


# ──────────────────────────────────────────────────────────────────────
# Advantages — карточки преимуществ
# ──────────────────────────────────────────────────────────────────────


class AdvantagesCard(BaseModel):
    uid: Optional[str] = None
    slug: Optional[str] = None
    title: str
    description: str
    isCta: bool = False
    linkText: Optional[str] = None
    linkUrl: Optional[str] = None
    ctaButtonText: Optional[str] = None
    ctaButtonUrl: Optional[str] = None


class AdvantagesContentRequest(BaseModel):
    headline: str
    subtitle: str
    cards: List[AdvantagesCard]


# ──────────────────────────────────────────────────────────────────────
# Key Advantages — иконные преимущества
# ──────────────────────────────────────────────────────────────────────


class KeyAdvantageItem(BaseModel):
    icon: Optional[str] = None  # SVG как текст или ссылка
    title: str
    description: str


class KeyAdvantagesContentRequest(BaseModel):
    headline: str
    advantages: List[KeyAdvantageItem]


# ──────────────────────────────────────────────────────────────────────
# Pricing — тарифы
# ──────────────────────────────────────────────────────────────────────


class PricingPlan(BaseModel):
    title: str
    price: str
    features: List[str]
    isHighlighted: bool = False
    buttonText: str = ""
    buttonUrl: str = ""


class PricingContentRequest(BaseModel):
    headline: str
    subtitle: str
    description: str
    plans: List[PricingPlan]


# ──────────────────────────────────────────────────────────────────────
# FAQ — вопросы/ответы
# ──────────────────────────────────────────────────────────────────────


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


# ──────────────────────────────────────────────────────────────────────
# Users / Lama — статичные блоки со счётчиком и ссылками
# ──────────────────────────────────────────────────────────────────────


class UsersContentRequest(BaseModel):
    number: int
    textLine: str
    textLine_1: str
    buttonText: str
    buttonUrl: str = ""


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


class HeaderNavLink(BaseModel):
    text: str
    href: str
    order: Optional[int] = None


class ToolsItem(BaseModel):
    title: str
    description: Optional[str] = None
    href: str
    order: Optional[int] = None


class HeaderContentRequest(BaseModel):
    brandPrefix: str
    brandSuffix: str
    toolsLabel: str
    toolsOrder: Optional[int] = None
    loginText: str
    loginHref: str
    registerText: str
    registerHref: str
    telegramText: str
    telegramHref: str
    navLinks: List[HeaderNavLink]


class ToolsContentRequest(BaseModel):
    items: List[ToolsItem]


class TemplateBlockAdvantage(BaseModel):
    text: str


class TemplateBlock(BaseModel):
    title: str = ""
    subtitle: str = ""
    description: str = ""
    advantages: Optional[List[TemplateBlockAdvantage]] = None
    image: Optional[HeroImage] = None
    imagePosition: Optional[str] = "right"  # "left" or "right"


class TemplateCardItem(BaseModel):
    title: str = ""
    text: str = ""
    buttonText: str = ""
    buttonLink: Optional[str] = None


class TemplateCardsBlockRequest(BaseModel):
    headline: str = ""
    cards: List[TemplateCardItem] = []


class TemplateSubscribePlacementRequest(BaseModel):
    position: str = "after_cards"  # after_block | after_faq | after_cards
    afterBlockNumber: Optional[int] = None


class TemplateSubscribeBlockRequest(BaseModel):
    title: str = ""
    subtitle: str = ""
    buttonText: str = ""
    buttonLink: Optional[str] = None
    placement: Optional[TemplateSubscribePlacementRequest] = None


class TemplateContentRequest(BaseModel):
    headline: str = ""
    lead: str = ""
    body: str = ""
    ctaText: Optional[str] = None
    ctaUrl: Optional[str] = None
    images: Optional[List[HeroImage]] = None
    blocks: Optional[List[TemplateBlock]] = None
    faq: Optional[FAQContentRequest] = None
    cardsBlock: Optional[TemplateCardsBlockRequest] = None
    subscribeBlock: Optional[TemplateSubscribeBlockRequest] = None
    subscribePlacement: Optional[TemplateSubscribePlacementRequest] = None
    subscribeBlocks: Optional[List[TemplateSubscribeBlockRequest]] = None


class CreateTemplateRequest(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    order: int = 0


class UpdateTemplateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
