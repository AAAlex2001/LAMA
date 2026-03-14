"""Сервис для работы с шаблонами (Templates) как отдельными сущностями в БД."""

from __future__ import annotations
from fastapi import HTTPException

from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.landing import Locale, Template, TemplateContent


def _coerce_locale(locale: str | Locale | None) -> Locale:
    if isinstance(locale, Locale):
        return locale
    if isinstance(locale, str) and locale in Locale.__members__:
        return Locale[locale]
    return Locale.RU


def _safe_str(value: Any) -> str:
    return str(value).strip() if value is not None else ""


async def list_templates(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить список всех активных шаблонов."""
    result = await db.execute(
        select(Template)
        .where(Template.is_active == True)
        .order_by(Template.order, Template.id)
    )
    templates_db = result.scalars().all()

    templates = [
        {
            "id": t.id,
            "slug": t.slug,
            "title": t.title,
            "description": t.description,
            "order": t.order,
        }
        for t in templates_db
    ]

    return {
        "count": len(templates),
        "templates": templates,
    }


async def get_template(db: AsyncSession, template_id: int, locale: str | Locale | None = None) -> Dict[str, Any] | None:
    """Получить шаблон по ID."""
    result = await db.execute(
        select(Template)
        .where(Template.id == template_id)
        .where(Template.is_active == True)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "id": template.id,
        "slug": template.slug,
        "title": template.title,
        "description": template.description,
        "order": template.order,
    }


async def get_template_by_slug(db: AsyncSession, slug: str, locale: str | Locale | None = None) -> Dict[str, Any] | None:
    """Получить шаблон по slug."""
    slug_norm = _safe_str(slug).lower()
    if not slug_norm:
        raise HTTPException(status_code=400, detail="Invalid slug")

    result = await db.execute(
        select(Template)
        .where(Template.slug == slug_norm)
        .where(Template.is_active == True)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "id": template.id,
        "slug": template.slug,
        "title": template.title,
        "description": template.description,
        "order": template.order,
    }




def _normalize_blocks(raw_blocks: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_blocks, list):
        return []

    blocks: List[Dict[str, Any]] = []
    for raw in raw_blocks:
        if not isinstance(raw, dict):
            continue

        title = _safe_str(raw.get("title"))
        subtitle = _safe_str(raw.get("subtitle"))
        description = _safe_str(raw.get("description"))

        # advantages: optional list[{text}]
        advantages_in = raw.get("advantages")
        advantages: Optional[List[Dict[str, str]]] = None
        if isinstance(advantages_in, list):
            cleaned: List[Dict[str, str]] = []
            for adv in advantages_in:
                if not isinstance(adv, dict):
                    continue
                text = _safe_str(adv.get("text"))
                if text:
                    cleaned.append({"text": text})
            advantages = cleaned

        # image: optional {url, alt}
        image_in = raw.get("image")
        image: Optional[Dict[str, str]] = None
        if isinstance(image_in, dict):
            url = _safe_str(image_in.get("url"))
            if url:
                alt = _safe_str(image_in.get("alt"))
                image = {"url": url, "alt": alt}

        block: Dict[str, Any] = {
            "title": title,
            "subtitle": subtitle,
            "description": description,
            "imagePosition": _safe_str(raw.get("imagePosition")) or "right",
        }
        if advantages is not None:
            block["advantages"] = advantages
        if image is not None:
            block["image"] = image

        blocks.append(block)

    return blocks


def _normalize_faq(raw_faq: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw_faq, dict):
        raise HTTPException(status_code=400, detail="Invalid faq data structure")

    headline = _safe_str(raw_faq.get("headline"))

    raw_items = raw_faq.get("faqItems")
    items: List[Dict[str, str]] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            q = _safe_str(item.get("question"))
            a = _safe_str(item.get("answer"))
            if q or a:
                items.append({"question": q, "answer": a})

    faq: Dict[str, Any] = {
        "headline": headline,
        "faqItems": items,
        "primaryButtonText": _safe_str(raw_faq.get("primaryButtonText")) or None,
        "primaryButtonLink": _safe_str(raw_faq.get("primaryButtonLink")) or None,
        "secondaryButtonText": _safe_str(raw_faq.get("secondaryButtonText")) or None,
        "secondaryButtonLink": _safe_str(raw_faq.get("secondaryButtonLink")) or None,
        "helpText": _safe_str(raw_faq.get("helpText")) or None,
        "botLink": _safe_str(raw_faq.get("botLink")) or None,
    }

    has_any = bool(
        faq.get("headline")
        or faq.get("faqItems")
        or faq.get("primaryButtonText")
        or faq.get("primaryButtonLink")
        or faq.get("secondaryButtonText")
        or faq.get("secondaryButtonLink")
        or faq.get("helpText")
        or faq.get("botLink")
    )
    return faq if has_any else None


def _normalize_cards_block(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="Invalid cards block data structure")

    headline = _safe_str(raw.get("headline"))

    raw_cards = raw.get("cards")
    cards: List[Dict[str, Any]] = []
    if isinstance(raw_cards, list):
        for c in raw_cards:
            if not isinstance(c, dict):
                continue
            title = _safe_str(c.get("title"))
            text = _safe_str(c.get("text"))
            button_text = _safe_str(c.get("buttonText"))
            button_link = _safe_str(c.get("buttonLink")) or None
            if title or text or button_text or button_link:
                cards.append(
                    {
                        "title": title,
                        "text": text,
                        "buttonText": button_text,
                        "buttonLink": button_link,
                    }
                )

    block: Dict[str, Any] = {
        "headline": headline,
        "cards": cards,
    }

    return block if (headline or cards) else None


def _normalize_subscribe_block(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="Invalid subscribe block data structure")

    block: Dict[str, Any] = {
        "title": _safe_str(raw.get("title")),
        "subtitle": _safe_str(raw.get("subtitle")),
        "buttonText": _safe_str(raw.get("buttonText")),
        "buttonLink": _safe_str(raw.get("buttonLink")) or None,
    }

    has_any = bool(block["title"] or block["subtitle"]
                   or block["buttonText"] or block["buttonLink"])
    return block if has_any else None


def _normalize_subscribe_placement(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="Invalid subscribe placement data structure")

    position = _safe_str(raw.get("position")).lower() or "after_cards"
    if position not in {"after_block", "after_faq", "after_cards"}:
        position = "after_cards"

    after_raw = raw.get("afterBlockNumber")
    after_block_number: Optional[int] = None
    if isinstance(after_raw, int):
        after_block_number = after_raw
    else:
        try:
            after_block_number = int(str(after_raw))
        except Exception:
            after_block_number = None

    if after_block_number is not None and after_block_number < 1:
        after_block_number = 1

    placement: Dict[str, Any] = {
        "position": position,
        "afterBlockNumber": after_block_number,
    }

    # keep it only if meaningful
    if position == "after_block" and not after_block_number:
        raise HTTPException(status_code=400, detail="afterBlockNumber is required when position is 'after_block'")
    return placement


def _normalize_subscribe_blocks(raw: Any) -> List[Dict[str, Any]]:
    items_raw: Any = None
    if isinstance(raw, list):
        items_raw = raw
    elif isinstance(raw, dict):
        items_raw = raw.get("subscribeBlocks") or raw.get(
            "items") or raw.get("blocks")

    blocks: List[Dict[str, Any]] = []
    if not isinstance(items_raw, list):
        return blocks

    for item in items_raw:
        if not isinstance(item, dict):
            continue
        block = _normalize_subscribe_block(item)
        if block is None:
            continue

        placement = _normalize_subscribe_placement(
            item.get("placement")
            or item.get("subscribePlacement")
            or item.get("subscribe_placement")
        )

        out: Dict[str, Any] = dict(block)
        if placement is not None:
            out["placement"] = placement
        blocks.append(out)

    return blocks







async def get_template_content(
    db: AsyncSession,
    slug: str,
    locale: str | Locale | None = None,
) -> Dict[str, Any] | None:
    """Получить контент конкретного шаблона."""
    template = await get_template_by_slug(db, slug=slug, locale=locale)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    locale_enum = _coerce_locale(locale)
    
    result = await db.execute(
        select(TemplateContent)
        .where(TemplateContent.template_id == template["id"])
        .where(TemplateContent.locale == locale_enum)
        .where(TemplateContent.is_active == True)
    )
    content = result.scalar_one_or_none()

    if not content:
        return {
            "headline": template.get("title", ""),
            "lead": template.get("description", ""),
            "body": "",
            "ctaText": None,
            "ctaUrl": None,
            "images": [],
            "blocks": [],
            "faq": None,
            "cardsBlock": None,
            "subscribeBlocks": [],
        }

    images = content.images or []
    blocks = content.blocks or []
    faq = content.faq
    cards_block = content.cards_block
    subscribe_blocks = content.subscribe_blocks or []

    return {
        "headline": content.headline or template.get("title", ""),
        "lead": content.lead or template.get("description", ""),
        "body": content.body or "",
        "ctaText": content.cta_text,
        "ctaUrl": content.cta_url,
        "images": images if isinstance(images, list) else [],
        "blocks": blocks if isinstance(blocks, list) else [],
        "faq": faq if isinstance(faq, dict) else None,
        "cardsBlock": cards_block if isinstance(cards_block, dict) else None,
        "subscribeBlocks": subscribe_blocks if isinstance(subscribe_blocks, list) else [],
    }




async def save_template_content(
    db: AsyncSession,
    slug: str,
    content: Dict[str, Any],
    locale: str | Locale | None = None,
) -> Dict[str, str] | None:
    """Сохранить контент шаблона."""
    template = await get_template_by_slug(db, slug=slug, locale=locale)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    locale_enum = _coerce_locale(locale)
    
    result = await db.execute(
        select(TemplateContent)
        .where(TemplateContent.template_id == template["id"])
        .where(TemplateContent.locale == locale_enum)
    )
    template_content = result.scalar_one_or_none()

    def normalize_images(raw: Any) -> List[Dict[str, str]]:
        if not isinstance(raw, list):
            return []
        result = []
        for img in raw:
            if isinstance(img, dict) and img.get("url"):
                result.append({
                    "url": _safe_str(img.get("url")),
                    "alt": _safe_str(img.get("alt")) or "Hero illustration"
                })
        return result

    images = normalize_images(content.get("images")) if content.get("images") else []
    blocks = _normalize_blocks(content.get("blocks")) if content.get("blocks") else []
    faq = _normalize_faq(content.get("faq")) if content.get("faq") else None
    cards_block = _normalize_cards_block(content.get("cardsBlock")) if content.get("cardsBlock") else None
    subscribe_blocks = _normalize_subscribe_blocks(content.get("subscribeBlocks")) if content.get("subscribeBlocks") else []

    if template_content:
        template_content.headline = _safe_str(content.get("headline"))
        template_content.lead = _safe_str(content.get("lead"))
        template_content.body = _safe_str(content.get("body"))
        template_content.cta_text = _safe_str(content.get("ctaText")) or None
        template_content.cta_url = _safe_str(content.get("ctaUrl")) or None
        template_content.images = images
        template_content.blocks = blocks
        template_content.faq = faq
        template_content.cards_block = cards_block
        template_content.subscribe_blocks = subscribe_blocks
        template_content.is_active = True
    else:
        template_content = TemplateContent(
            template_id=template["id"],
            locale=locale_enum,
            headline=_safe_str(content.get("headline")),
            lead=_safe_str(content.get("lead")),
            body=_safe_str(content.get("body")),
            cta_text=_safe_str(content.get("ctaText")) or None,
            cta_url=_safe_str(content.get("ctaUrl")) or None,
            images=images,
            blocks=blocks,
            faq=faq,
            cards_block=cards_block,
            subscribe_blocks=subscribe_blocks,
            is_active=True,
        )
        db.add(template_content)

    await db.flush()
    return {"status": "ok", "message": "Template content saved"}


async def create_template(
    db: AsyncSession,
    slug: str,
    title: str,
    description: str | None = None,
    order: int = 0,
) -> Dict[str, Any]:
    """Создать новый шаблон."""
    template = Template(
        slug=slug.lower().strip(),
        title=title,
        description=description,
        is_active=True,
        order=order,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    
    return {
        "id": template.id,
        "slug": template.slug,
        "title": template.title,
        "description": template.description,
        "order": template.order,
    }


async def update_template(
    db: AsyncSession,
    slug: str,
    title: str | None = None,
    description: str | None = None,
    order: int | None = None,
    is_active: bool | None = None,
) -> Dict[str, Any] | None:
    """Обновить шаблон."""
    result = await db.execute(
        select(Template).where(Template.slug == slug.lower().strip())
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if title is not None:
        template.title = title
    if description is not None:
        template.description = description
    if order is not None:
        template.order = order
    if is_active is not None:
        template.is_active = is_active
    
    await db.flush()
    await db.refresh(template)
    
    return {
        "id": template.id,
        "slug": template.slug,
        "title": template.title,
        "description": template.description,
        "order": template.order,
        "is_active": template.is_active,
    }


async def delete_template(db: AsyncSession, slug: str) -> bool:
    """Удалить шаблон."""
    result = await db.execute(
        select(Template).where(Template.slug == slug.lower().strip())
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.delete(template)
    await db.flush()
    return True
