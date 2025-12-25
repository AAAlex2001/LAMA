"""
Утилиты для работы с клавиатурами Telegram
"""
from typing import Optional, List, Dict, Any, Union

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


def build_keyboard(
    buttons_data: Optional[Union[List[List[Dict[str, str]]], Dict[str, Any]]],
) -> Optional[InlineKeyboardMarkup]:
    """
    Построить inline keyboard из данных
    
    Поддерживает два формата:
    1. List[List[Dict]] - прямой массив рядов кнопок:
       [[{"text": "Button 1", "url": "..."}], [{"text": "Button 2"}]]
    
    2. Dict с ключом "buttons" - объект с массивом:
       {"buttons": [[{"text": "Button 1", "url": "..."}]]}
    
    Args:
        buttons_data: Данные кнопок в одном из поддерживаемых форматов
        
    Returns:
        InlineKeyboardMarkup или None если данные пустые/невалидные
    """
    if not buttons_data:
        return None

    # Нормализуем данные к формату List[List[Dict]]
    if isinstance(buttons_data, dict):
        rows = buttons_data.get("buttons", [])
    elif isinstance(buttons_data, list):
        rows = buttons_data
    else:
        return None

    if not rows:
        return None

    keyboard = []
    for row in rows:
        if not isinstance(row, list):
            continue
            
        button_row = []
        for btn in row:
            if not isinstance(btn, dict):
                continue
                
            button_row.append(
                InlineKeyboardButton(
                    text=btn.get("text", ""),
                    url=btn.get("url"),
                    callback_data=btn.get("callback_data"),
                )
            )
            
        if button_row:
            keyboard.append(button_row)

    return InlineKeyboardMarkup(inline_keyboard=keyboard) if keyboard else None
