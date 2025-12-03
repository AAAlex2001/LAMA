"""
Настройка FastAPI Admin для управления контентом лендинга
"""
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

from backend.database import engine
from backend.admin.models import LandingSection, LandingContent

# Используем тот же secret_key что и в main.py
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "your-secret-key-here-change-in-production")


class AdminAuth(AuthenticationBackend):
    """Простая аутентификация для админки (можно расширить)"""
    
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        
        # TODO: Реализовать проверку через вашу систему аутентификации
        # Пока что простой хардкод для разработки
        if username == "admin" and password == "admin":
            request.session["admin"] = True
            # Важно: сессия должна быть изменена, чтобы сохраниться
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        admin_status = request.session.get("admin", False)
        return bool(admin_status)


class LandingSectionAdmin(ModelView, model=LandingSection):
    """Админ-панель для секций лендинга"""
    name = "Секция лендинга"
    name_plural = "Секции лендинга"
    icon = "fa-solid fa-layer-group"
    
    column_list = [LandingSection.id, LandingSection.section_type, LandingSection.title, LandingSection.is_active, LandingSection.order]
    column_details_list = [LandingSection.id, LandingSection.section_type, LandingSection.title, LandingSection.description, 
                          LandingSection.is_active, LandingSection.order, LandingSection.created_at, LandingSection.updated_at]
    column_searchable_list = [LandingSection.section_type, LandingSection.title]
    column_sortable_list = [LandingSection.id, LandingSection.order, LandingSection.created_at]
    
    form_columns = [LandingSection.section_type, LandingSection.title, LandingSection.description, 
                   LandingSection.is_active, LandingSection.order]


class LandingContentAdmin(ModelView, model=LandingContent):
    """Админ-панель для контента лендинга"""
    name = "Контент лендинга"
    name_plural = "Контент лендинга"
    icon = "fa-solid fa-file-text"
    
    column_list = [LandingContent.id, LandingContent.key, LandingContent.content_type, 
                   LandingContent.title, LandingContent.section_id, LandingContent.is_active, LandingContent.order]
    column_details_list = [LandingContent.id, LandingContent.key, LandingContent.content_type, 
                          LandingContent.section_id, LandingContent.title, LandingContent.text, 
                          LandingContent.subtitle, LandingContent.image_url, LandingContent.link_url,
                          LandingContent.is_active, LandingContent.order, LandingContent.extra_data,
                          LandingContent.created_at, LandingContent.updated_at]
    column_searchable_list = [LandingContent.key, LandingContent.title, LandingContent.text]
    column_sortable_list = [LandingContent.id, LandingContent.order, LandingContent.created_at]
    column_filters = [LandingContent.content_type, LandingContent.section_id, LandingContent.is_active]
    
    form_columns = [LandingContent.section_id, LandingContent.content_type, LandingContent.key,
                   LandingContent.title, LandingContent.text, LandingContent.subtitle,
                   LandingContent.image_url, LandingContent.image_alt, LandingContent.link_url,
                   LandingContent.link_text, LandingContent.is_active, LandingContent.order,
                   LandingContent.extra_data]


def setup_admin(app):
    """Настройка и подключение админки к приложению"""
    authentication_backend = AdminAuth(secret_key=ADMIN_SECRET_KEY)
    
    admin = Admin(
        app=app,
        engine=engine,
        authentication_backend=authentication_backend,
        title="LAMA Admin",
        base_url="/admin",
    )
    
    # Регистрация моделей
    admin.add_view(LandingSectionAdmin)
    admin.add_view(LandingContentAdmin)
    
    return admin

