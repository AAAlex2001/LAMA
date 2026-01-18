// Популярные TLD для проверки ссылок
const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'ru', 'io', 'co', 'me', 'tv', 'ai', 'app', 'dev',
  'uk', 'de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'ch', 'pl', 'cz', 'ua', 'by', 'kz',
  'us', 'ca', 'mx', 'br', 'ar', 'cn', 'jp', 'kr', 'in', 'au', 'nz', 'za',
  'info', 'biz', 'pro', 'name', 'mobi', 'online', 'site', 'tech', 'store', 'blog',
]);

/**
 * Проверяет валидность URL (только ASCII домены, http/https)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = url.includes('://') ? new URL(url) : new URL(`https://${url}`);
    
    // Только http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Только ASCII символы в домене
    if (!/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
      return false;
    }
    
    // Проверяем TLD
    const parts = parsed.hostname.split('.');
    if (parts.length < 2) return false;
    
    const tld = parts[parts.length - 1].toLowerCase();
    return COMMON_TLDS.has(tld);
  } catch {
    return false;
  }
}

/**
 * Проверяет наличие ссылки в HTML
 */
export function hasLink(html: string): boolean {
  // Есть тег <a>
  if (/<a\s+[^>]*href/i.test(html)) {
    return true;
  }
  
  // Есть URL в тексте
  const text = html.replace(/<[^>]+>/g, ' ');
  const urlMatch = text.match(/https?:\/\/[a-z0-9][a-z0-9.-]*\.([a-z]{2,})/i);
  
  if (urlMatch && COMMON_TLDS.has(urlMatch[1].toLowerCase())) {
    return true;
  }
  
  return false;
}
