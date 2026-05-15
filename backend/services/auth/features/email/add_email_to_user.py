from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.auth import User
from backend.services.auth.features.email.passwords import hash_password
from backend.services.auth.features.users.get_user import GetUser
from backend.services.auth.features.users.get_user_by_email import GetUserByEmail


class AddEmailToUser:
    """Привязка email+пароля к существующему юзеру (для telegram-only аккаунтов)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute(
        self,
        user_id: int,
        email: str,
        password: str,
        agree_personal_data: bool,
        agree_terms: bool,
    ) -> User:
        if not agree_personal_data:
            raise HTTPException(status_code=400, detail="Personal data consent is required")
        if not agree_terms:
            raise HTTPException(status_code=400, detail="Terms of service must be accepted")

        normalized_email = email.lower()
        existing_user = await GetUserByEmail(self.db).execute(normalized_email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=409, detail="This email is already used by another account")

        user = await GetUser(self.db).execute(user_id)
        user.email = normalized_email
        user.password_hash = hash_password(password)
        user.agree_personal_data = agree_personal_data
        user.agree_terms = agree_terms
        await self.db.flush()

        return await GetUser(self.db).execute(user.id)
