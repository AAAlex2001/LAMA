import { IANA_TLDS } from './tlds';

const TLDS_PATTERN = IANA_TLDS.slice().sort((a, b) => b.length - a.length).join('|');
const DOMAIN = `(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:${TLDS_PATTERN})`;
const BOUNDARY = `(?=$|[:/?#]|[^a-z0-9-])`;

export const LINK_REGEX = new RegExp(
  `((?:https?:\\/\\/)${DOMAIN}${BOUNDARY}(?::\\d{2,5})?(?:[/?#][^\\s<>]*)?|(?:www\\.)?${DOMAIN}${BOUNDARY}(?:[/?#][^\\s<>]*)?)`,
  'gi'
);

export function hasLink(text: string): boolean {
  LINK_REGEX.lastIndex = 0;
  return LINK_REGEX.test(text);
}

export function toHref(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function splitTrailingPunctuation(raw: string): { url: string; suffix: string } {
  let url = raw;
  let suffix = '';
  while (/[\]\)\}\.,!\?:;]+$/.test(url)) {
    suffix = url.slice(-1) + suffix;
    url = url.slice(0, -1);
  }
  return { url, suffix };
}

export function linkifyHtml(html: string): string {
  const normalized = html.replace(/\u200B/g, '');

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = normalized;

  tempDiv.querySelectorAll('a').forEach((a) => {
    a.replaceWith(document.createTextNode(a.textContent || ''));
  });

  tempDiv.normalize();

  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  textNodes.forEach((textNode) => {
    const parentEl = textNode.parentElement;
    if (parentEl?.tagName === 'A') return;

    const text = textNode.textContent || '';
    LINK_REGEX.lastIndex = 0;
    if (!LINK_REGEX.test(text)) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    LINK_REGEX.lastIndex = 0;

    text.replace(LINK_REGEX, (match, url, offset) => {
      if (offset > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
      }

      const { url: cleanUrl, suffix } = splitTrailingPunctuation(String(url));
      const link = document.createElement('a');
      link.href = toHref(cleanUrl);
      link.textContent = cleanUrl;
      fragment.appendChild(link);

      if (suffix) {
        fragment.appendChild(document.createTextNode(suffix));
      }

      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return tempDiv.innerHTML;
}
