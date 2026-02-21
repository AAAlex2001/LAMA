import re
from typing import List, Optional
from urllib.parse import urlparse


URL_PATTERN = re.compile(
    r'https?://[^\s]+|(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:/[^\s]*)?',
    re.IGNORECASE,
)


def extract_links(text: str) -> List[str]:
    """Извлечь все ссылки из текста."""
    if not text:
        return []
    return URL_PATTERN.findall(text)


def extract_domain(link: str) -> Optional[str]:
    """Извлечь домен из ссылки."""
    try:
        if not link.startswith(("http://", "https://")):
            link = "http://" + link
        parsed = urlparse(link)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain if domain else None
    except Exception:
        return None


def is_in_list(link: str, domain: str, filter_list: List[str]) -> bool:
    """Проверить, содержится ли домен/ссылка в списке."""
    link_lower = link.lower()
    for item in filter_list:
        item_lower = item.lower().strip()
        if item_lower == domain or item_lower in link_lower:
            return True
    return False
