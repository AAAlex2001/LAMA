export function extractPlainTextFromHtml(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function hasNonEmptyText(html: string): boolean {
  return extractPlainTextFromHtml(html).length > 0;
}

export function hasSupportedFormatting(html: string): boolean {
  return /<\/?(?:a|b|i|s|u|code|pre|tg-spoiler)>/i.test(html || '');
}
