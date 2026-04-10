const LOCALE_PREFIX_RE = /^\/(ru|sr|en)(\/|$)/i;

export function normalizeLocalizedHref(href: string, locale: string): string {
  const safeHref = String(href ?? '').trim();

  if (!safeHref) {
    return '';
  }

  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(safeHref)) {
    return safeHref;
  }

  if (safeHref.startsWith('#') || safeHref.startsWith('?')) {
    return `/${locale}${safeHref}`;
  }

  if (safeHref.startsWith('/')) {
    return LOCALE_PREFIX_RE.test(safeHref) ? safeHref : `/${locale}${safeHref}`;
  }

  return `/${locale}/${safeHref.replace(/^\/+/, '')}`;
}