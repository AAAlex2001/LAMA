"""
Методы для работы с секцией Advantages
"""
from typing import List, Dict, Any
from uuid import uuid4
import re
import unicodedata
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType, Locale


_CYRILLIC_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
    "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""

    value = "".join(_CYRILLIC_TRANSLIT.get(ch, ch) for ch in value)
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    value = re.sub(r"-+", "-", value)
    return value


def _ensure_uid(card: Dict[str, Any], fallback_uid: str | None = None) -> str:
    uid = str(card.get("uid") or "").strip()
    if uid:
        return uid
    if fallback_uid:
        return fallback_uid
    return uuid4().hex


def _ensure_slug(card: Dict[str, Any], uid: str) -> str:
    slug = str(card.get("slug") or "").strip().lower()
    if slug:
        slug = _slugify(slug) or slug
        return slug
    base = _slugify(str(card.get("title") or ""))
    if base:
        return base
    return f"t-{uid[:10]}"


def coerce_locale(locale: str | Locale | None) -> Locale:
    if isinstance(locale, Locale):
        return locale
    if isinstance(locale, str) and locale in Locale.__members__:
        return Locale[locale]
    return Locale.RU


async def get_advantages_content(db: AsyncSession, locale: str | Locale | None = None) -> Dict[str, Any]:
    """Получить контент для секции Advantages"""
    locale_enum = coerce_locale(locale)
    section_result = await db.execute(
        select(LandingSection)
        .where(LandingSection.section_type == SectionType.ADVANTAGES)
        .where(LandingSection.is_active == True)
    )
    section = section_result.scalar_one_or_none()

    if not section:
        return {
            "headline": "",
            "subtitle": "",
            "cards": []
        }

    content_result = await db.execute(
        select(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
        .where(LandingContent.is_active == True)
        .order_by(LandingContent.order)
    )
    contents: List[LandingContent] = list(content_result.scalars().all())

    response: Dict[str, Any] = {}
    cards: List[Dict[str, Any]] = []

    for content in contents:
        if content.key == "advantages_headline":
            response["headline"] = content.title or content.text or ""
        elif content.key == "advantages_subtitle":
            response["subtitle"] = content.text or ""
        elif content.key.startswith("advantages_card_"):
            # Новый формат: ключ advantages_card_<uid>, порядок берём из order.
            # Старый формат: advantages_card_<index> — тоже поддерживаем.
            suffix = content.key[len("advantages_card_"):]
            fallback_uid = suffix if suffix else None

            extra = content.extra_data or {}
            uid = str(extra.get("uid")
                      or fallback_uid or "").strip() or uuid4().hex
            slug = str(extra.get("slug") or "").strip() or _ensure_slug(
                {"title": content.title or ""}, uid)

            cards.append(
                {
                    "uid": uid,
                    "slug": slug,
                    "title": content.title or "",
                    "description": content.text or "",
                    "isCta": bool(extra.get("isCta", False)),
                    "linkText": content.link_text,
                    "linkUrl": content.link_url,
                    "ctaButtonText": extra.get("ctaButtonText"),
                    "ctaButtonUrl": extra.get("ctaButtonUrl"),
                }
            )

    return {
        "headline": response.get("headline", ""),
        "subtitle": response.get("subtitle", ""),
        "cards": cards
    }


async def save_advantages_content(
    db: AsyncSession,
    headline: str,
    subtitle: str,
    cards: List[Dict[str, Any]],
    locale: str | Locale | None = None,
) -> Dict[str, str]:
    """Сохранить контент для секции Advantages"""
    locale_enum = coerce_locale(locale)
    result = await db.execute(
        select(LandingSection).where(
            LandingSection.section_type == SectionType.ADVANTAGES)
    )
    section = result.scalar_one_or_none()

    if not section:
        section = LandingSection(
            section_type=SectionType.ADVANTAGES,
            title="Advantages Section",
            is_active=True,
            order=1
        )
        db.add(section)
        await db.flush()

    await db.execute(
        delete(LandingContent)
        .where(LandingContent.section_id == section.id)
        .where(LandingContent.locale == locale_enum)
    )

    contents = [
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="advantages_headline",
            title=headline,
            is_active=True,
            order=1
        ),
        LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key="advantages_subtitle",
            text=subtitle,
            is_active=True,
            order=2
        )
    ]

    for i, card in enumerate(cards):
        uid = _ensure_uid(card, fallback_uid=str(i))
        slug = _ensure_slug(card, uid)

        extra_data = {
            **({"isCta": True} if card.get("isCta", False) else {}),
            "uid": uid,
            "slug": slug,
        }

        # Добавляем CTA кнопку если есть
        if card.get("ctaButtonText"):
            extra_data["ctaButtonText"] = card.get("ctaButtonText")
        if card.get("ctaButtonUrl"):
            extra_data["ctaButtonUrl"] = card.get("ctaButtonUrl")

        contents.append(LandingContent(
            section_id=section.id,
            content_type=ContentType.TEXT,
            locale=locale_enum,
            key=f"advantages_card_{uid}",
            title=card.get("title", ""),
            text=card.get("description", ""),
            link_text=card.get("linkText"),
            link_url=card.get("linkUrl"),
            extra_data=extra_data,
            is_active=True,
            order=10 + i
        ))

    db.add_all(contents)
    await db.flush()

    return {"status": "ok", "message": "Advantages content saved"}
