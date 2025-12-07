"""
Сервис для работы с контентом лендинга
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.landing import LandingSection, LandingContent, SectionType, ContentType


class LandingService:
    """Сервис для работы с контентом лендинга"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_hero_content(self) -> Dict[str, Any]:
        """Получить контент для секции Hero"""
        # Получаем секцию Hero (только активную)
        result = await self.db.execute(
            select(LandingSection)
            .where(LandingSection.section_type == SectionType.HERO)
            .where(LandingSection.is_active == True)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            # Возвращаем дефолтные значения если секции нет
            default_images = [
                {"url": "/hero_1.svg", "alt": "Hero illustration"},
                {"url": "/hero_2.svg", "alt": "Hero illustration"},
                {"url": "/hero_3.svg", "alt": "Hero illustration"},
                {"url": "/hero_4.svg", "alt": "Hero illustration"},
                {"url": "/hero_5.svg", "alt": "Hero illustration"}
            ]
            return {
                "headline": "Управляйте сообществами и ботами Telegram в одном месте",
                "paragraph": "Экономьте время на рутине и увеличивайте охваты с помощью LAMAplanner",
                "paragraphSecondary": "Вы здесь не случайно: нужный сервис перед вами",
                "buttonText": "Начать бесплатно",
                "images": default_images
            }
        
        # Получаем весь контент для этой секции
        result = await self.db.execute(
            select(LandingContent)
            .where(LandingContent.section_id == section.id)
            .where(LandingContent.is_active == True)
            .order_by(LandingContent.order)
        )
        contents = result.scalars().all()
        
        # Формируем ответ из контента
        response = {}
        images = []
        
        for content in contents:
            if content.key == "hero_headline":
                response["headline"] = content.title or content.text or ""
            elif content.key == "hero_paragraph":
                response["paragraph"] = content.text or ""
            elif content.key == "hero_paragraph_secondary":
                response["paragraphSecondary"] = content.text or ""
            elif content.key == "hero_button":
                response["buttonText"] = content.text or "Начать бесплатно"
            elif content.key.startswith("hero_image_"):
                # Картинки с ключами hero_image_1, hero_image_2 и т.д.
                if content.image_url:
                    images.append({
                        "key": content.key,
                        "url": content.image_url,
                        "alt": content.image_alt or "Hero illustration"
                    })
        
        # Сортируем картинки по ключу
        images.sort(key=lambda x: x["key"])
        
        # Дефолтные значения если чего-то не хватает
        default_images = [
            {"url": "/hero_1.svg", "alt": "Hero illustration"},
            {"url": "/hero_2.svg", "alt": "Hero illustration"},
            {"url": "/hero_3.svg", "alt": "Hero illustration"},
            {"url": "/hero_4.svg", "alt": "Hero illustration"},
            {"url": "/hero_5.svg", "alt": "Hero illustration"}
        ]
        
        return {
            "headline": response.get("headline", "Управляйте сообществами и ботами Telegram в одном месте"),
            "paragraph": response.get("paragraph", "Экономьте время на рутине и увеличивайте охваты с помощью LAMAplanner"),
            "paragraphSecondary": response.get("paragraphSecondary", "Вы здесь не случайно: нужный сервис перед вами"),
            "buttonText": response.get("buttonText", "Начать бесплатно"),
            "images": images if images else default_images
        }

    async def save_hero_content(
        self,
        headline: str,
        paragraph: str,
        paragraph_secondary: str,
        button_text: str,
        images: List[Dict[str, str]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Hero"""
        # Получаем или создаем секцию Hero
        result = await self.db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.HERO)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            section = LandingSection(
                section_type=SectionType.HERO,
                title="Hero Section",
                is_active=True,
                order=0
            )
            self.db.add(section)
            await self.db.flush()
        
        # Удаляем старый контент
        await self.db.execute(
            delete(LandingContent).where(LandingContent.section_id == section.id)
        )
        
        # Создаем новый контент
        contents = [
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="hero_headline",
                title=headline,
                is_active=True,
                order=1
            ),
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="hero_paragraph",
                text=paragraph,
                is_active=True,
                order=2
            ),
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="hero_paragraph_secondary",
                text=paragraph_secondary,
                is_active=True,
                order=3
            ),
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="hero_button",
                text=button_text,
                is_active=True,
                order=4
            )
        ]
        
        # Добавляем картинки
        for i, image in enumerate(images):
            contents.append(LandingContent(
                section_id=section.id,
                content_type=ContentType.IMAGE,
                key=f"hero_image_{i + 1}",
                image_url=image.get("url", ""),
                image_alt=image.get("alt", "Hero illustration"),
                is_active=True,
                order=10 + i
            ))
        
        self.db.add_all(contents)
        await self.db.commit()
        
        return {"status": "ok", "message": "Hero content saved"}

    async def get_advantages_content(self) -> Dict[str, Any]:
        """Получить контент для секции Advantages"""
        result = await self.db.execute(
            select(LandingSection)
            .where(LandingSection.section_type == SectionType.ADVANTAGES)
            .where(LandingSection.is_active == True)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            return {
                "headline": "Всё для продуктивной и лёгкой работы с контентом",
                "subtitle": "Профессиональный инструмент для тех, кто ценит порядок и эффективность",
                "cards": [
                    {"title": "Создавайте ботов", "description": "Подключай ботов по токену @BotFather и управляй ими. Приветственные боты и боты обратной связи легко и быстро настраиваются", "isCta": False, "linkText": None},
                    {"title": "Дополнительная функция 1", "description": "Описание дополнительной функции 1", "isCta": False, "linkText": None},
                    {"title": "cta", "description": "Сомнения позади: вы на пути к верному решению!", "isCta": True, "linkText": None},
                ]
            }
        
        result = await self.db.execute(
            select(LandingContent)
            .where(LandingContent.section_id == section.id)
            .where(LandingContent.is_active == True)
            .order_by(LandingContent.order)
        )
        contents = result.scalars().all()
        
        response = {}
        cards = []
        
        for content in contents:
            if content.key == "advantages_headline":
                response["headline"] = content.title or content.text or ""
            elif content.key == "advantages_subtitle":
                response["subtitle"] = content.text or ""
            elif content.key.startswith("advantages_card_"):
                card_index = int(content.key.split("_")[-1])
                while len(cards) <= card_index:
                    cards.append({"title": "", "description": "", "isCta": False, "linkText": None})
                
                if content.title:
                    cards[card_index]["title"] = content.title
                if content.text:
                    cards[card_index]["description"] = content.text
                if content.link_text:
                    cards[card_index]["linkText"] = content.link_text
                # isCta храним в extra_data или как отдельное поле
                if content.extra_data and content.extra_data.get("isCta"):
                    cards[card_index]["isCta"] = True
        
        return {
            "headline": response.get("headline", "Всё для продуктивной и лёгкой работы с контентом"),
            "subtitle": response.get("subtitle", "Профессиональный инструмент для тех, кто ценит порядок и эффективность"),
            "cards": cards if cards else []
        }

    async def save_advantages_content(
        self,
        headline: str,
        subtitle: str,
        cards: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Advantages"""
        result = await self.db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.ADVANTAGES)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            section = LandingSection(
                section_type=SectionType.ADVANTAGES,
                title="Advantages Section",
                is_active=True,
                order=1
            )
            self.db.add(section)
            await self.db.flush()
        
        await self.db.execute(
            delete(LandingContent).where(LandingContent.section_id == section.id)
        )
        
        contents = [
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="advantages_headline",
                title=headline,
                is_active=True,
                order=1
            ),
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="advantages_subtitle",
                text=subtitle,
                is_active=True,
                order=2
            )
        ]
        
        for i, card in enumerate(cards):
            contents.append(LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key=f"advantages_card_{i}",
                title=card.get("title", ""),
                text=card.get("description", ""),
                link_text=card.get("linkText"),
                extra_data={"isCta": card.get("isCta", False)} if card.get("isCta", False) else {},
                is_active=True,
                order=10 + i
            ))
        
        self.db.add_all(contents)
        await self.db.commit()
        
        return {"status": "ok", "message": "Advantages content saved"}

    async def get_key_advantages_content(self) -> Dict[str, Any]:
        """Получить контент для секции Key Advantages"""
        result = await self.db.execute(
            select(LandingSection)
            .where(LandingSection.section_type == SectionType.KEY_ADVANTAGES)
            .where(LandingSection.is_active == True)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            return {
                "headline": "Почему выбирают LAMAplanner",
                "advantages": []
            }
        
        result = await self.db.execute(
            select(LandingContent)
            .where(LandingContent.section_id == section.id)
            .where(LandingContent.is_active == True)
            .order_by(LandingContent.order)
        )
        contents = result.scalars().all()
        
        response = {}
        advantages = []
        
        for content in contents:
            if content.key == "key_advantages_headline":
                response["headline"] = content.title or content.text or ""
            elif content.key.startswith("key_advantage_"):
                advantage_index = int(content.key.split("_")[-1])
                while len(advantages) <= advantage_index:
                    advantages.append({"icon": None, "title": "", "description": ""})
                
                if content.image_url:
                    advantages[advantage_index]["icon"] = content.image_url
                elif content.extra_data and content.extra_data.get("icon"):
                    advantages[advantage_index]["icon"] = content.extra_data["icon"]
                if content.title:
                    advantages[advantage_index]["title"] = content.title
                if content.text:
                    advantages[advantage_index]["description"] = content.text
        
        return {
            "headline": response.get("headline", "Почему выбирают LAMAplanner"),
            "advantages": advantages if advantages else []
        }

    async def save_key_advantages_content(
        self,
        headline: str,
        advantages: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Key Advantages"""
        result = await self.db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.KEY_ADVANTAGES)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            section = LandingSection(
                section_type=SectionType.KEY_ADVANTAGES,
                title="Key Advantages Section",
                is_active=True,
                order=2
            )
            self.db.add(section)
            await self.db.flush()
        
        await self.db.execute(
            delete(LandingContent).where(LandingContent.section_id == section.id)
        )
        
        contents = [
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="key_advantages_headline",
                title=headline,
                is_active=True,
                order=1
            )
        ]
        
        for i, advantage in enumerate(advantages):
            extra_data = {}
            icon = advantage.get("icon")
            if icon and not icon.startswith("http") and not icon.startswith("/"):
                # Если это SVG текст, сохраняем в extra_data
                extra_data["icon"] = icon
            
            contents.append(LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key=f"key_advantage_{i}",
                title=advantage.get("title", ""),
                text=advantage.get("description", ""),
                image_url=icon if icon and (icon.startswith("http") or icon.startswith("/")) else None,
                extra_data=extra_data if extra_data else {},
                is_active=True,
                order=10 + i
            ))
        
        self.db.add_all(contents)
        await self.db.commit()
        
        return {"status": "ok", "message": "Key Advantages content saved"}

    async def get_pricing_content(self) -> Dict[str, Any]:
        """Получить контент для секции Pricing"""
        result = await self.db.execute(
            select(LandingSection)
            .where(LandingSection.section_type == SectionType.PRICING)
            .where(LandingSection.is_active == True)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            return {
                "headline": "Выберите свой план",
                "subtitle": "Решение для любого масштаба проектов",
                "description": "От личного блога до крупного проекта — управляйте контентом эффективно и выгодно",
                "plans": [
                    {
                        "title": "Пробный",
                        "price": "0 ₽/сутки",
                        "features": ["Тестируйте все функции 24 часа"],
                        "isHighlighted": False
                    },
                    {
                        "title": "Базовый",
                        "price": "890 ₽/месяц",
                        "features": [
                            "Доступен полный функционал сервиса",
                            "Подключение до 5 каналов / чатов",
                            "Создание и управление 5 ботами",
                            "Подключение до 3 RSS-лент / репостеров"
                        ],
                        "isHighlighted": True
                    },
                    {
                        "title": "Профессиональный",
                        "price": "1590 ₽/месяц",
                        "features": [
                            "Доступен полный функционал сервиса",
                            "Подключение до 15 каналов / чатов",
                            "Создание и управление 15 ботами",
                            "Подключение до 7 RSS-лент / репостеров"
                        ],
                        "isHighlighted": False
                    }
                ]
            }
        
        result = await self.db.execute(
            select(LandingContent)
            .where(LandingContent.section_id == section.id)
            .where(LandingContent.is_active == True)
            .order_by(LandingContent.order)
        )
        contents = result.scalars().all()
        
        response = {}
        plans = []
        
        for content in contents:
            if content.key == "pricing_headline":
                response["headline"] = content.title or content.text or ""
            elif content.key == "pricing_subtitle":
                response["subtitle"] = content.title or content.text or ""
            elif content.key == "pricing_description":
                response["description"] = content.text or ""
            elif content.key.startswith("pricing_plan_"):
                plan_index = int(content.key.split("_")[-1])
                while len(plans) <= plan_index:
                    plans.append({"title": "", "price": "", "features": [], "isHighlighted": False})
                
                if content.title:
                    plans[plan_index]["title"] = content.title
                if content.text:
                    plans[plan_index]["price"] = content.text
                if content.extra_data:
                    if "features" in content.extra_data:
                        plans[plan_index]["features"] = content.extra_data["features"]
                    if "isHighlighted" in content.extra_data:
                        plans[plan_index]["isHighlighted"] = content.extra_data["isHighlighted"]
        
        return {
            "headline": response.get("headline", "Выберите свой план"),
            "subtitle": response.get("subtitle", "Решение для любого масштаба проектов"),
            "description": response.get("description", "От личного блога до крупного проекта — управляйте контентом эффективно и выгодно"),
            "plans": plans if plans else []
        }

    async def save_pricing_content(
        self,
        headline: str,
        subtitle: str,
        description: str,
        plans: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Pricing"""
        result = await self.db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.PRICING)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            section = LandingSection(
                section_type=SectionType.PRICING,
                title="Pricing Section",
                is_active=True,
                order=3
            )
            self.db.add(section)
            await self.db.flush()
        
        await self.db.execute(
            delete(LandingContent).where(LandingContent.section_id == section.id)
        )
        
        contents = [
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="pricing_headline",
                title=headline,
                is_active=True,
                order=1
            ),
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="pricing_subtitle",
                title=subtitle,
                is_active=True,
                order=2
            ),
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="pricing_description",
                text=description,
                is_active=True,
                order=3
            )
        ]
        
        for i, plan in enumerate(plans):
            # Сохраняем features в extra_data
            features = plan.get("features", [])
            is_highlighted = plan.get("isHighlighted", False)
            
            contents.append(LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key=f"pricing_plan_{i}",
                title=plan.get("title", ""),
                text=plan.get("price", ""),
                extra_data={
                    "features": features,
                    "isHighlighted": is_highlighted
                },
                is_active=True,
                order=10 + i
            ))
        
        self.db.add_all(contents)
        await self.db.commit()
        
        return {"status": "ok", "message": "Pricing content saved"}

    async def get_faq_content(self) -> Dict[str, Any]:
        """Получить контент для секции FAQ"""
        result = await self.db.execute(
            select(LandingSection)
            .where(LandingSection.section_type == SectionType.FAQ)
            .where(LandingSection.is_active == True)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            return {
                "headline": "Часто задаваемые вопросы",
                "faqItems": [
                    {
                        "question": "Можно ли использовать Lama Planner бесплатно?",
                        "answer": "Да, у нас есть пробный период на 24 часа, в течение которого вы можете протестировать все функции сервиса бесплатно."
                    }
                ]
            }
        
        result = await self.db.execute(
            select(LandingContent)
            .where(LandingContent.section_id == section.id)
            .where(LandingContent.is_active == True)
            .order_by(LandingContent.order)
        )
        contents = result.scalars().all()
        
        response = {}
        faq_items = []
        
        for content in contents:
            if content.key == "faq_headline":
                response["headline"] = content.title or content.text or ""
            elif content.key.startswith("faq_item_"):
                item_index = int(content.key.split("_")[-1])
                while len(faq_items) <= item_index:
                    faq_items.append({"question": "", "answer": ""})
                
                if content.title:
                    faq_items[item_index]["question"] = content.title
                if content.text:
                    faq_items[item_index]["answer"] = content.text
        
        return {
            "headline": response.get("headline", "Часто задаваемые вопросы"),
            "faqItems": faq_items if faq_items else []
        }

    async def save_faq_content(
        self,
        headline: str,
        faq_items: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции FAQ"""
        result = await self.db.execute(
            select(LandingSection).where(LandingSection.section_type == SectionType.FAQ)
        )
        section = result.scalar_one_or_none()
        
        if not section:
            section = LandingSection(
                section_type=SectionType.FAQ,
                title="FAQ Section",
                is_active=True,
                order=4
            )
            self.db.add(section)
            await self.db.flush()
        
        await self.db.execute(
            delete(LandingContent).where(LandingContent.section_id == section.id)
        )
        
        contents = [
            LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key="faq_headline",
                title=headline,
                is_active=True,
                order=1
            )
        ]
        
        for i, item in enumerate(faq_items):
            contents.append(LandingContent(
                section_id=section.id,
                content_type=ContentType.TEXT,
                key=f"faq_item_{i}",
                title=item.get("question", ""),
                text=item.get("answer", ""),
                is_active=True,
                order=10 + i
            ))
        
        self.db.add_all(contents)
        await self.db.commit()
        
        return {"status": "ok", "message": "FAQ content saved"}

