"""Сервис для генерации "шаблонов" из Advantages карточек.

Логика: количество шаблонов равно количеству карточек, у которых isCta == False.
Идентификатор шаблона (template_id) — это 1-based индекс в отфильтрованном списке.
"""

from __future__ import annotations

from typing import Any, Dict, List

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
        elif suffix.startswith("hero_image_"):
            if content.image_url:
                images.append(
                    {
                        "url": content.image_url,
                        "alt": content.image_alt or "Hero illustration",
                    }
                )

    data["images"] = images

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

    db.add_all(rows)
    await db.commit()
    return {"status": "ok", "message": "Template content saved"}
