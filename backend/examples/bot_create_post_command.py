"""
Пример команды для Telegram бота - генерация ссылки для создания поста

Добавьте этот код в обработчик команды бота (например /create_post)
"""

import aiohttp
import os
from aiogram import types


async def generate_create_post_link(telegram_id: int, username: str = None, first_name: str = None, last_name: str = None) -> str:
    """
    Генерирует ссылку с токеном для создания поста
    
    Args:
        telegram_id: ID пользователя в Telegram
        username: Username пользователя (опционально)
        first_name: Имя пользователя (опционально)
        last_name: Фамилия пользователя (опционально)
    
    Returns:
        Ссылка вида: https://site.com/ru/create-post?token=xxx
    """
    api_base_url = os.getenv('API_BASE_URL', 'http://localhost:8000/api')
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # Запрос к API для получения токена
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f'{api_base_url}/auth/bot-guest-token',
            json={
                'telegram_id': telegram_id,
                'username': username,
                'first_name': first_name,
                'last_name': last_name
            }
        ) as response:
            if response.status == 200:
                data = await response.json()
                access_token = data['access_token']
                
                # Формируем ссылку
                return f'{frontend_url}/ru/create-post?token={access_token}'
            else:
                raise Exception(f'Failed to generate token: {response.status}')


# Пример обработчика команды в боте (aiogram)
async def cmd_create_post(message: types.Message):
    """
    Команда /create_post - отправляет пользователю ссылку для создания поста
    """
    try:
        # Генерируем ссылку с токеном
        link = await generate_create_post_link(
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name
        )
        
        # Отправляем ссылку пользователю
        await message.answer(
            f"✍️ Создайте пост через веб-интерфейс:\n\n"
            f"🔗 {link}\n\n"
            f"⏱ Ссылка действительна 24 часа",
            disable_web_page_preview=True
        )
        
    except Exception as e:
        await message.answer(f"❌ Ошибка при создании ссылки: {e}")


# Регистрация команды
# dp.register_message_handler(cmd_create_post, commands=['create_post'])
