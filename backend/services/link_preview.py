from fastapi import HTTPException
import re
import logging
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

from backend.schemas.link_preview import LinkPreview

logger = logging.getLogger(__name__)


async def get_link_preview(url: str, timeout: int = 10) -> LinkPreview:
    """Получить метаданные ссылки"""
    if not is_valid_url(url):
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            response = await client.get(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            )
            
            if 'text/html' not in response.headers.get('content-type', ''):
                return create_fallback_preview(url)

            html = response.text or ''
            if not html.strip():
                return create_fallback_preview(url)
            
            return parse_html(html, url)
            
    except Exception as e:
        logger.error(f"Error fetching preview for {url}: {e}")
        return create_fallback_preview(url)


def parse_html(html: str, url: str) -> LinkPreview:
    soup = BeautifulSoup(html, 'html.parser')
    parsed_url = urlparse(url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    return LinkPreview(
        url=url,
        title=get_title(soup),
        description=get_description(soup),
        image=get_image(soup, base_url),
        site_name=get_site_name(soup, parsed_url.netloc),
        favicon=get_favicon(soup, base_url)
    )


def get_title(soup: BeautifulSoup) -> str:
    og_title = soup.find('meta', property='og:title')
    if og_title and og_title.get('content'):
        return og_title['content'].strip()
    
    twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
    if twitter_title and twitter_title.get('content'):
        return twitter_title['content'].strip()
    
    title_tag = soup.find('title')
    if title_tag and title_tag.string:
        return title_tag.string.strip()
    
    return ''


def get_description(soup: BeautifulSoup) -> str:
    og_desc = soup.find('meta', property='og:description')
    if og_desc and og_desc.get('content'):
        return og_desc['content'].strip()
    
    twitter_desc = soup.find('meta', attrs={'name': 'twitter:description'})
    if twitter_desc and twitter_desc.get('content'):
        return twitter_desc['content'].strip()
    
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    if meta_desc and meta_desc.get('content'):
        return meta_desc['content'].strip()
    
    return ''


def get_image(soup: BeautifulSoup, base_url: str) -> str:
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        return normalize_url(og_image['content'], base_url)
    
    twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
    if twitter_image and twitter_image.get('content'):
        return normalize_url(twitter_image['content'], base_url)
    
    img_tag = soup.find('img', src=True)
    if img_tag:
        return normalize_url(img_tag['src'], base_url)
    
    return ''


def get_site_name(soup: BeautifulSoup, netloc: str) -> str:
    og_site = soup.find('meta', property='og:site_name')
    if og_site and og_site.get('content'):
        return og_site['content'].strip()
    
    return netloc


def get_favicon(soup: BeautifulSoup, base_url: str) -> str:
    icon = soup.find('link', rel=lambda x: x and 'icon' in x.lower())
    if icon and icon.get('href'):
        return normalize_url(icon['href'], base_url)
    
    return f"{base_url}/favicon.ico"


def normalize_url(url: str, base_url: str) -> str:
    if not url:
        return ''
    
    if url.startswith('http://') or url.startswith('https://'):
        return url
    
    if url.startswith('//'):
        return f"https:{url}"
    
    if url.startswith('/'):
        return f"{base_url}{url}"
    
    return f"{base_url}/{url}"


def is_valid_url(url: str) -> bool:
    pattern = re.compile(
        r'^https?://'
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
        r'localhost|'
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        r'(?::\d+)?'
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return bool(pattern.match(url))


def create_fallback_preview(url: str) -> LinkPreview:
    parsed = urlparse(url)
    return LinkPreview(
        url=url,
        title=parsed.netloc or url,
        description='',
        image='',
        site_name=parsed.netloc or '',
        favicon=''
    )
