"""
Сервис для работы с контентом лендинга
"""
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.landing import hero, advantages, key_advantages, pricing, faq, users


class LandingService:
    """Сервис для работы с контентом лендинга"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_hero_content(self) -> Dict[str, Any]:
        """Получить контент для секции Hero"""
        return await hero.get_hero_content(self.db)

    async def save_hero_content(
        self,
        headline: str,
        paragraph: str,
        paragraph_secondary: str,
        button_text: str,
        images: List[Dict[str, str]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Hero"""
        return await hero.save_hero_content(
            self.db, headline, paragraph, paragraph_secondary, button_text, images
        )

    async def get_advantages_content(self) -> Dict[str, Any]:
        """Получить контент для секции Advantages"""
        return await advantages.get_advantages_content(self.db)

    async def save_advantages_content(
        self,
        headline: str,
        subtitle: str,
        cards: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Advantages"""
        return await advantages.save_advantages_content(self.db, headline, subtitle, cards)

    async def get_key_advantages_content(self) -> Dict[str, Any]:
        """Получить контент для секции Key Advantages"""
        return await key_advantages.get_key_advantages_content(self.db)

    async def save_key_advantages_content(
        self,
        headline: str,
        advantages: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Key Advantages"""
        return await key_advantages.save_key_advantages_content(self.db, headline, advantages)

    async def get_pricing_content(self) -> Dict[str, Any]:
        """Получить контент для секции Pricing"""
        return await pricing.get_pricing_content(self.db)

    async def save_pricing_content(
        self,
        headline: str,
        subtitle: str,
        description: str,
        plans: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции Pricing"""
        return await pricing.save_pricing_content(self.db, headline, subtitle, description, plans)

    async def get_faq_content(self) -> Dict[str, Any]:
        """Получить контент для секции FAQ"""
        return await faq.get_faq_content(self.db)

    async def save_faq_content(
        self,
        headline: str,
        faq_items: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Сохранить контент для секции FAQ"""
        return await faq.save_faq_content(self.db, headline, faq_items)

    async def get_users_content(self) -> Dict[str, Any]:
        """Получить контент для секции Users"""
        return await users.get_users_content(self.db)

    async def save_users_content(
        self,
        number: int,
        text_line: str,
        text_line_1: str,
        button_text: str
    ) -> Dict[str, str]:
        """Сохранить контент для секции Users"""
        return await users.save_users_content(self.db, number, text_line, text_line_1, button_text)

