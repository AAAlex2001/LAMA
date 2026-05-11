const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'ru', 'io', 'co', 'me', 'tv', 'ai', 'app', 'dev',
  'uk', 'de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'ch', 'pl', 'cz', 'ua', 'by', 'kz',
  'us', 'ca', 'mx', 'br', 'ar', 'cn', 'jp', 'kr', 'in', 'au', 'nz', 'za',
  'info', 'biz', 'pro', 'name', 'mobi', 'online', 'site', 'tech', 'store', 'blog',
]);
export function isValidUrl(url: string): boolean {
  try {
    const parsed = url.includes('://') ? new URL(url) : new URL(`https://${url}`);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    if (!/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
      return false;
    }
    
    const parts = parsed.hostname.split('.');
    if (parts.length < 2) return false;
    
    const tld = parts[parts.length - 1].toLowerCase();
    return COMMON_TLDS.has(tld);
  } catch {
    return false;
  }
}

export function hasHyperlink(html: string): boolean {
  return /<a\s+[^>]*href/i.test(html);
}

function normalizeUrlLike(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export function hasEmbeddedHyperlink(html: string): boolean {
  if (!hasHyperlink(html)) return false;

  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = linkRegex.exec(html);

  while (match) {
    const href = match[1] || '';
    const innerRaw = match[2] || '';
    const innerText = innerRaw.replace(/<[^>]+>/g, '').trim();

    if (!innerText) {
      return true;
    }

    const normalizedHref = normalizeUrlLike(href);
    const normalizedText = normalizeUrlLike(innerText);

    if (normalizedHref && normalizedText && normalizedHref !== normalizedText) {
      return true;
    }

    match = linkRegex.exec(html);
  }

  return false;
}

export function hasLink(html: string): boolean {
  if (hasHyperlink(html)) {
    return true;
  }
  
  const text = html.replace(/<[^>]+>/g, ' ');
  const urlMatch = text.match(/https?:\/\/[a-z0-9][a-z0-9.-]*\.([a-z]{2,})/i);
  
  if (urlMatch && COMMON_TLDS.has(urlMatch[1].toLowerCase())) {
    return true;
  }
  
  return false;
}

export function hasPlainUrlLikeText(html: string): boolean {
  const text = html.replace(/<[^>]+>/g, ' ');
  const urlMatch = text.match(/https?:\/\/[a-z0-9][a-z0-9.-]*\.([a-z]{2,})/i);

  if (urlMatch && COMMON_TLDS.has(urlMatch[1].toLowerCase())) {
    return true;
  }

  return false;
}
