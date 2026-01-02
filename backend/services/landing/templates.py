"""Сервис для генерации "шаблонов" из Advantages карточек.

Логика: количество шаблонов равно количеству карточек, у которых isCta == False.
Идентификатор шаблона (template_id) — это 1-based индекс в отфильтрованном списке.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.landing import ContentType, LandingContent, LandingSection, Locale, SectionType
from backend.services.landing import advantages


def _coerce_locale(locale: str | Locale | None) -> Locale:
    if isinstance(locale, Locale):
        return locale
    if isinstance(locale, str) and locale in Locale.__members__:
        return Locale[locale]
    return Locale.RU


def _is_cta(card: Dict[str, Any]) -> bool:
    return bool(card.get("isCta", False))


def _safe_str(value: Any) -> str:
    return str(value).strip() if value is not None else ""


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
        return None

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
        return None

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
        return None

    block: Dict[str, Any] = {
        "title": _safe_str(raw.get("title")),
        "subtitle": _safe_str(raw.get("subtitle")),
        "buttonText": _safe_str(raw.get("buttonText")),
        "buttonLink": _safe_str(raw.get("buttonLink")) or None,
    }

    has_any = bool(block["title"] or block["subtitle"] or block["buttonText"] or block["buttonLink"])
    return block if has_any else None


def _normalize_subscribe_placement(raw: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None

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
        return None
    return placement


def _normalize_subscribe_blocks(raw: Any) -> List[Dict[str, Any]]:
    items_raw: Any = None
    if isinstance(raw, list):
        items_raw = raw
    elif isinstance(raw, dict):
        items_raw = raw.get("subscribeBlocks") or raw.get("items") or raw.get("blocks")

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


async def list_templates(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    locale_enum = _coerce_locale(locale)

    adv = await advantages.get_advantages_content(db, locale=locale_enum)
    cards: List[Dict[str, Any]] = list(adv.get("cards") or [])

    templates: List[Dict[str, Any]] = []
    template_id = 0

    for card_index, card in enumerate(cards):
        if _is_cta(card):
            continue

        template_id += 1
        uid = _safe_str(card.get("uid")) or _safe_str(card.get("slug")) or str(card_index)
        slug = _safe_str(card.get("slug")) or f"t-{uid[:10]}"

        templates.append(
            {
                "id": template_id,
                "slug": slug,
                "uid": uid,
                "sourceCardIndex": card_index,
                "title": card.get("title", ""),
                "description": card.get("description", ""),
                "linkText": card.get("linkText"),
                "linkUrl": card.get("linkUrl"),
            }
        )

    return {
        "count": len(templates),
        "templates": templates,
    }


async def get_template(db: AsyncSession, template_id: int, locale: str | Locale | None = None) -> Dict[str, Any] | None:
    data = await list_templates(db, locale=locale)
    templates: List[Dict[str, Any]] = data["templates"]

    if template_id < 1 or template_id > len(templates):
        return None

    return templates[template_id - 1]


async def get_template_by_slug(db: AsyncSession, slug: str, locale: str | Locale | None = None) -> Dict[str, Any] | None:
    slug_norm = _safe_str(slug).lower()
    if not slug_norm:
        return None

    data = await list_templates(db, locale=locale)
    templates: List[Dict[str, Any]] = data["templates"]
    for t in templates:
        if _safe_str(t.get("slug")).lower() == slug_norm:
            return t
    return None


async def get_template_content(
    db: AsyncSession,
    slug: str,
    locale: str | Locale | None = None,
) -> Dict[str, Any] | None:
    """Получить контент конкретного шаблона (для публичной страницы и админки).

    Контент хранится в LandingContent в секции SectionType.OTHER с ключами вида:
      template_<uid>_headline, template_<uid>_lead, template_<uid>_body,
      template_<uid>_cta_text, template_<uid>_cta_url

    Если контента нет, возвращаются дефолты из Advantages карточки.
    """

    template = await get_template_by_slug(db, slug=slug, locale=locale)
    if not template:
        return None

    locale_enum = _coerce_locale(locale)
    uid = _safe_str(template.get("uid"))
    prefix = f"template_{uid}_"

    defaults = {
        "headline": _safe_str(template.get("title")),
        "lead": _safe_str(template.get("description")),
        "body": "",
        "ctaText": template.get("linkText"),
        "ctaUrl": template.get("linkUrl"),
        "images": [],
        "blocks": [],
        "faq": None,
        "cardsBlock": None,
        "subscribeBlock": None,
        "subscribePlacement": None,
        "subscribeBlocks": [],
    }

    result = await db.execute(select(LandingSection).where(LandingSection.section_type == SectionType.OTHER))
    section = result.scalar_one_or_none()
    if not section:
        return defaults

    result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .where(LandingContent.key.like(f"{prefix}%"))
        .order_by(LandingContent.order)
    )
    contents = list(result.scalars().all())

    data: Dict[str, Any] = dict(defaults)
    images: List[Dict[str, str]] = []
    blocks: List[Dict[str, Any]] = []
    faq: Optional[Dict[str, Any]] = None
    cards_block: Optional[Dict[str, Any]] = None
    subscribe_block: Optional[Dict[str, Any]] = None
    subscribe_placement: Optional[Dict[str, Any]] = None
    subscribe_blocks: List[Dict[str, Any]] = []
    for content in contents:
        suffix = content.key[len(prefix) :]
        if suffix == "headline":
            data["headline"] = content.text or content.title or ""
        elif suffix == "lead":
            data["lead"] = content.text or ""
        elif suffix == "body":
            data["body"] = content.text or ""
        elif suffix == "cta_text":
            data["ctaText"] = content.text or ""
        elif suffix == "cta_url":
            data["ctaUrl"] = content.link_url or content.text or ""
        elif suffix == "blocks":
            extra = content.extra_data
            raw_blocks: Any = None
            if isinstance(extra, dict):
                raw_blocks = extra.get("blocks") or extra.get("items")
            elif isinstance(extra, list):
                raw_blocks = extra
            blocks = _normalize_blocks(raw_blocks)
        elif suffix == "faq":
            extra = content.extra_data
            if isinstance(extra, dict):
                faq = _normalize_faq(extra)
            else:
                headline = content.text or content.title or ""
                faq = _normalize_faq({"headline": headline, "faqItems": []})
        elif suffix == "cards_block":
            extra = content.extra_data
            if isinstance(extra, dict):
                cards_block = _normalize_cards_block(extra)
        elif suffix == "subscribe_block":
            extra = content.extra_data
            if isinstance(extra, dict):
                subscribe_block = _normalize_subscribe_block(extra)
        elif suffix == "subscribe_placement":
            extra = content.extra_data
            if isinstance(extra, dict):
                subscribe_placement = _normalize_subscribe_placement(extra)
        elif suffix == "subscribe_blocks":
            extra = content.extra_data
            subscribe_blocks = _normalize_subscribe_blocks(extra)
        elif suffix.startswith("hero_image_"):
            if content.image_url:
                images.append(
                    {
                        "url": content.image_url,
                        "alt": content.image_alt or "Hero illustration",
                    }
                )

    data["images"] = images
    data["blocks"] = blocks
    data["faq"] = faq
    data["cardsBlock"] = cards_block

    # Backward/forward compatibility between legacy fields and new array.
    if subscribe_blocks and subscribe_block is None:
        first = subscribe_blocks[0]
        subscribe_block = _normalize_subscribe_block(first)
        subscribe_placement = _normalize_subscribe_placement(first.get("placement"))
    elif (not subscribe_blocks) and subscribe_block is not None:
        first = dict(subscribe_block)
        if subscribe_placement is not None:
            first["placement"] = subscribe_placement
        subscribe_blocks = [first]

    data["subscribeBlocks"] = subscribe_blocks
    data["subscribeBlock"] = subscribe_block
    data["subscribePlacement"] = subscribe_placement

    return data


async def save_template_content(
    db: AsyncSession,
    slug: str,
    content: Dict[str, Any],
    locale: str | Locale | None = None,
) -> Dict[str, str] | None:
    """Сохранить контент шаблона.

    Требуется существующий template (derived из Advantages). Сохраняем в SectionType.OTHER.
    """

    template = await get_template_by_slug(db, slug=slug, locale=locale)
    if not template:
        return None

    locale_enum = _coerce_locale(locale)
    uid = _safe_str(template.get("uid"))
    prefix = f"template_{uid}_"

    result = await db.execute(select(LandingSection).where(LandingSection.section_type == SectionType.OTHER))
    section = result.scalar_one_or_none()
    if not section:
        section = LandingSection(
            section_type=SectionType.OTHER,
            title="Templates",
            description="Template pages content",
            is_active=True,
            order=900,
        )
        db.add(section)
        await db.flush()

    # Удаляем старый контент этого шаблона только для текущей локали
    await db.execute(
        delete(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.key.like(f"{prefix}%"))
    )

    headline = _safe_str(content.get("headline"))
    lead = _safe_str(content.get("lead"))
    body = _safe_str(content.get("body"))
    cta_text = _safe_str(content.get("ctaText"))
    cta_url = _safe_str(content.get("ctaUrl"))
    images: List[Dict[str, str]] = list(content.get("images") or [])
    blocks = _normalize_blocks(content.get("blocks"))
    faq = _normalize_faq(content.get("faq"))
    cards_block = _normalize_cards_block(content.get("cardsBlock"))
    subscribe_block = _normalize_subscribe_block(content.get("subscribeBlock"))
    subscribe_placement = _normalize_subscribe_placement(content.get("subscribePlacement"))
    subscribe_blocks = _normalize_subscribe_blocks(content.get("subscribeBlocks"))

    if not subscribe_blocks and subscribe_block is not None:
        first = dict(subscribe_block)
        if subscribe_placement is not None:
            first["placement"] = subscribe_placement
        subscribe_blocks = [first]

    legacy_subscribe_block = subscribe_block
    legacy_subscribe_placement = subscribe_placement
    if subscribe_blocks:
        first = subscribe_blocks[0]
        legacy_subscribe_block = _normalize_subscribe_block(first)
        legacy_subscribe_placement = _normalize_subscribe_placement(first.get("placement"))

    rows: List[LandingContent] = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"{prefix}headline",
            text=headline,
            is_active=True,
            order=1,
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"{prefix}lead",
            text=lead,
            is_active=True,
            order=2,
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"{prefix}body",
            text=body,
            is_active=True,
            order=3,
        ),
    ]

    # CTA (optional)
    if cta_text or cta_url:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}cta_text",
                text=cta_text,
                is_active=True,
                order=4,
            )
        )

    if cta_url:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.LINK,
                locale=locale_enum,
                key=f"{prefix}cta_url",
                link_url=cta_url,
                text=cta_url,
                is_active=True,
                order=5,
            )
        )

    # Blocks (optional)
    if blocks:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}blocks",
                extra_data={"blocks": blocks},
                is_active=True,
                order=6,
            )
        )

    # FAQ (optional)
    if faq is not None:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}faq",
                extra_data=faq,
                is_active=True,
                order=7,
            )
        )

    # Cards block (optional)
    if cards_block is not None:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}cards_block",
                extra_data=cards_block,
                is_active=True,
                order=8,
            )
        )

    # Subscribe blocks (new, optional)
    if subscribe_blocks:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}subscribe_blocks",
                extra_data={"subscribeBlocks": subscribe_blocks},
                is_active=True,
                order=9,
            )
        )

    # Subscribe block + placement (legacy, optional)
    if legacy_subscribe_block is not None:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}subscribe_block",
                extra_data=legacy_subscribe_block,
                is_active=True,
                order=10,
            )
        )

    if legacy_subscribe_placement is not None:
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                locale=locale_enum,
                key=f"{prefix}subscribe_placement",
                extra_data=legacy_subscribe_placement,
                is_active=True,
                order=11,
            )
        )

    # Hero images for this template (optional)
    for i, img in enumerate(images):
        url = _safe_str((img or {}).get("url"))
        if not url:
            continue
        alt = _safe_str((img or {}).get("alt")) or "Hero illustration"
        rows.append(
            LandingContent(
                section_id=section.id,
                content_type=ContentType.IMAGE,
                locale=locale_enum,
                key=f"{prefix}hero_image_{i + 1}",
                image_url=url,
                image_alt=alt,
                is_active=True,
                order=20 + i,
            )
        )

    db.add_all(rows)
    await db.commit()
    return {"status": "ok", "message": "Template content saved"}
