"""
Роуты для получения и сохранения контента лендинга
"""
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.landing import Locale
from backend.services.landing import hero, advantages, key_advantages, pricing, faq, users, lama, footer, templates, header, tools
from backend.schemas.landing import (
    HeroContentRequest,
    AdvantagesContentRequest,
    KeyAdvantagesContentRequest,
    PricingContentRequest,
    FAQContentRequest,
    UsersContentRequest,
    LamaContentRequest,
    FooterContentRequest,
    HeaderContentRequest,
    ToolsContentRequest,
    TemplateContentRequest,
    CreateTemplateRequest,
    UpdateTemplateRequest,
)

router = APIRouter()


def parse_locale(locale: str) -> Locale:
    normalized = (locale or "ru").strip().lower()
    mapping = {
        "ru": Locale.RU,
        "sr": Locale.SR,
        "en": Locale.EN,
    }
    return mapping.get(normalized, Locale.RU)


@router.get("/hero")
async def get_hero_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Hero"""
    parsed_locale = parse_locale(locale)
    return await hero.get_hero_content(db, locale=parsed_locale.value)


@router.get("/header")
async def get_header_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для Header"""
    parsed_locale = parse_locale(locale)
    return await header.get_header_content(db, locale=parsed_locale.value)


@router.put("/header")
async def save_header_content(
    data: HeaderContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для Header"""
    parsed_locale = parse_locale(locale)
    return await header.save_header_content(
        db,
        brand_prefix=data.brandPrefix,
        brand_suffix=data.brandSuffix,
        tools_label=data.toolsLabel,
        tools_order=data.toolsOrder,
        login_text=data.loginText,
        login_href=data.loginHref,
        register_text=data.registerText,
        register_href=data.registerHref,
        telegram_text=data.telegramText,
        telegram_href=data.telegramHref,
        nav_links=[link.dict() for link in data.navLinks],
        locale=parsed_locale.value,
    )


@router.get("/tools")
async def get_tools_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для Tools"""
    parsed_locale = parse_locale(locale)
    return await tools.get_tools_content(db, locale=parsed_locale.value)


@router.put("/tools")
async def save_tools_content(
    data: ToolsContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для Tools"""
    parsed_locale = parse_locale(locale)
    return await tools.save_tools_content(
        db,
        items=[item.dict() for item in data.items],
        locale=parsed_locale.value,
    )


@router.put("/hero")
async def save_hero_content(
    data: HeroContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Hero"""
    images = [{"url": img.url, "alt": img.alt} for img in data.images]
    template_images = [{"url": img.url, "alt": img.alt} for img in (data.templateImages or [])]
    parsed_locale = parse_locale(locale)
    return await hero.save_hero_content(
        db,
        headline=data.headline,
        paragraph=data.paragraph,
        paragraph_secondary=data.paragraphSecondary,
        button_text=data.buttonText,
        button_url=data.buttonUrl,
        images=images,
        template_images=template_images,
        locale=parsed_locale.value
    )


@router.get("/advantages")
async def get_advantages_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Advantages"""
    parsed_locale = parse_locale(locale)
    return await advantages.get_advantages_content(db, locale=parsed_locale.value)


@router.get("/templates")
async def list_templates(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента"),
):
    """Список всех активных шаблонов."""
    parsed_locale = parse_locale(locale)
    return await templates.list_templates(db, locale=parsed_locale.value)


@router.get("/templates/{template_id}")
async def get_template(
    template_id: int = Path(ge=1, description="ID шаблона"),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента"),
):
    """Получить шаблон по ID."""
    parsed_locale = parse_locale(locale)
    template = await templates.get_template(db, template_id=template_id, locale=parsed_locale.value)
    return template


@router.get("/templates/slug/{slug}")
async def get_template_by_slug(
    slug: str = Path(min_length=1, description="Slug шаблона"),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента"),
):
    """Получить шаблон по slug."""
    parsed_locale = parse_locale(locale)
    template = await templates.get_template_by_slug(db, slug=slug, locale=parsed_locale.value)
    return template


@router.get("/templates/slug/{slug}/content")
async def get_template_page_content(
    slug: str = Path(min_length=1, description="Slug шаблона"),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента"),
):
    """Получить контент страницы конкретного шаблона (редактируется в админке)."""
    parsed_locale = parse_locale(locale)
    content = await templates.get_template_content(db, slug=slug, locale=parsed_locale.value)
    return content


@router.put("/templates/slug/{slug}/content")
async def save_template_page_content(
    data: TemplateContentRequest,
    slug: str = Path(min_length=1, description="Slug шаблона"),
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента"),
):
    """Сохранить контент страницы конкретного шаблона (редактируется в админке)."""
    parsed_locale = parse_locale(locale)
    result = await templates.save_template_content(
        db,
        slug=slug,
        content={
            "headline": data.headline,
            "lead": data.lead,
            "body": data.body,
            "ctaText": data.ctaText,
            "ctaUrl": data.ctaUrl,
            "images": [{"url": img.url, "alt": img.alt} for img in (data.images or [])],
            "blocks": (
                [
                    {
                        "title": block.title,
                        "subtitle": block.subtitle,
                        "description": block.description,
                        "imagePosition": block.imagePosition or "right",
                        "advantages": (
                            [{"text": adv.text} for adv in (block.advantages or [])]
                            if block.advantages is not None
                            else None
                        ),
                        "image": ({"url": block.image.url, "alt": block.image.alt} if block.image else None),
                    }
                    for block in (data.blocks or [])
                ]
                if data.blocks is not None
                else None
            ),
            "faq": (data.faq.dict() if data.faq is not None else None),
            "cardsBlock": (data.cardsBlock.dict() if data.cardsBlock is not None else None),
            "subscribeBlock": (data.subscribeBlock.dict() if data.subscribeBlock is not None else None),
            "subscribePlacement": (data.subscribePlacement.dict() if data.subscribePlacement is not None else None),
            "subscribeBlocks": ([b.dict() for b in (data.subscribeBlocks or [])] if data.subscribeBlocks is not None else None),
        },
        locale=parsed_locale.value,
    )
    return result


@router.post("/templates")
async def create_template(
    data: CreateTemplateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Создать новый шаблон."""
    return await templates.create_template(
        db,
        slug=data.slug,
        title=data.title,
        description=data.description,
        order=data.order,
    )


@router.patch("/templates/slug/{slug}")
async def update_template(
    data: UpdateTemplateRequest,
    slug: str = Path(min_length=1, description="Slug шаблона"),
    db: AsyncSession = Depends(get_db),
):
    """Обновить шаблон."""
    result = await templates.update_template(
        db,
        slug=slug,
        title=data.title,
        description=data.description,
        order=data.order,
        is_active=data.is_active,
    )
    return result


@router.delete("/templates/slug/{slug}")
async def delete_template(
    slug: str = Path(min_length=1, description="Slug шаблона"),
    db: AsyncSession = Depends(get_db),
):
    """Удалить шаблон."""
    success = await templates.delete_template(db, slug=slug)
    return {"status": "ok", "message": "Template deleted"}


@router.put("/advantages")
async def save_advantages_content(
    data: AdvantagesContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Advantages"""
    cards = [
        {
            "uid": getattr(card, "uid", None),
            "slug": getattr(card, "slug", None),
            "title": card.title,
            "description": card.description,
            "isCta": card.isCta,
            "linkText": card.linkText,
            "linkUrl": card.linkUrl,
            "ctaButtonText": getattr(card, "ctaButtonText", None),
            "ctaButtonUrl": getattr(card, "ctaButtonUrl", None),
        }
        for card in data.cards
    ]
    parsed_locale = parse_locale(locale)
    return await advantages.save_advantages_content(
        db,
        headline=data.headline,
        subtitle=data.subtitle,
        cards=cards,
        locale=parsed_locale.value
    )


@router.get("/key-advantages")
async def get_key_advantages_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Key Advantages"""
    parsed_locale = parse_locale(locale)
    return await key_advantages.get_key_advantages_content(db, locale=parsed_locale.value)


@router.put("/key-advantages")
async def save_key_advantages_content(
    data: KeyAdvantagesContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Key Advantages"""
    advantages_list = [
        {
            "icon": advantage.icon,
            "title": advantage.title,
            "description": advantage.description
        }
        for advantage in data.advantages
    ]
    parsed_locale = parse_locale(locale)
    return await key_advantages.save_key_advantages_content(
        db,
        headline=data.headline,
        advantages=advantages_list,
        locale=parsed_locale.value
    )


@router.get("/pricing")
async def get_pricing_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Pricing"""
    parsed_locale = parse_locale(locale)
    return await pricing.get_pricing_content(db, locale=parsed_locale.value)


@router.put("/pricing")
async def save_pricing_content(
    data: PricingContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Pricing"""
    plans = [
        {
            "title": plan.title,
            "price": plan.price,
            "features": plan.features,
            "isHighlighted": plan.isHighlighted,
            "buttonText": plan.buttonText,
            "buttonUrl": plan.buttonUrl
        }
        for plan in data.plans
    ]
    parsed_locale = parse_locale(locale)
    return await pricing.save_pricing_content(
        db,
        headline=data.headline,
        subtitle=data.subtitle,
        description=data.description,
        plans=plans,
        locale=parsed_locale.value
    )


@router.get("/faq")
async def get_faq_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции FAQ"""
    parsed_locale = parse_locale(locale)
    return await faq.get_faq_content(db, locale=parsed_locale.value)


@router.put("/faq")
async def save_faq_content(
    data: FAQContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции FAQ"""
    faq_items = [
        {
            "question": item.question,
            "answer": item.answer
        }
        for item in data.faqItems
    ]
    parsed_locale = parse_locale(locale)
    return await faq.save_faq_content(
        db,
        headline=data.headline,
        faq_items=faq_items,
        primary_button_text=data.primaryButtonText,
        primary_button_link=data.primaryButtonLink,
        secondary_button_text=data.secondaryButtonText,
        secondary_button_link=data.secondaryButtonLink,
        help_text=data.helpText,
        bot_link=data.botLink,
        locale=parsed_locale.value
    )


@router.get("/users")
async def get_users_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Users"""
    parsed_locale = parse_locale(locale)
    return await users.get_users_content(db, locale=parsed_locale.value)


@router.put("/users")
async def save_users_content(
    data: UsersContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Users"""
    parsed_locale = parse_locale(locale)
    return await users.save_users_content(
        db,
        number=data.number,
        text_line=data.textLine,
        text_line_1=data.textLine_1,
        button_text=data.buttonText,
        button_url=data.buttonUrl,
        locale=parsed_locale.value
    )


@router.get("/lama")
async def get_lama_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Lama"""
    parsed_locale = parse_locale(locale)
    return await lama.get_lama_content(db, locale=parsed_locale.value)


@router.put("/lama")
async def save_lama_content(
    data: LamaContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Lama"""
    parsed_locale = parse_locale(locale)
    return await lama.save_lama_content(
        db,
        headline=data.headline,
        channel=data.channel,
        description=data.description,
        button_text=data.buttonText,
        button_href=data.buttonHref,
        locale=parsed_locale.value
    )


@router.get("/footer")
async def get_footer_content(
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Получить контент для секции Footer"""
    parsed_locale = parse_locale(locale)
    return await footer.get_footer_content(db, locale=parsed_locale.value)


@router.put("/footer")
async def save_footer_content(
    data: FooterContentRequest,
    db: AsyncSession = Depends(get_db),
    locale: str = Query(default="ru", description="Локаль контента")
):
    """Сохранить контент для секции Footer"""
    columns = [
        {
            "title": column.title,
            "links": [{"text": link.text, "href": link.href} for link in column.links]
        }
        for column in data.columns
    ]
    parsed_locale = parse_locale(locale)
    return await footer.save_footer_content(
        db,
        brand_name=data.brandName,
        copyright=data.copyright,
        telegram_link=data.telegramLink,
        instagram_link=data.instagramLink,
        columns=columns,
        locale=parsed_locale.value
    )

