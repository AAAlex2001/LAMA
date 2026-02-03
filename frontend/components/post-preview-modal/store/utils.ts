import type { MediaFile } from '@/components/media-preview';
import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';
import type { DocumentPreviewItem, MediaPreviewItem } from './types';

export type MediaRun =
  | { kind: 'visual'; items: MediaPreviewItem[] }
  | { kind: 'document'; items: DocumentPreviewItem[] };

export function normalizeMaybeUrl(value?: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('blob:') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }
  if (raw.startsWith('/')) return raw;

  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/${raw.replace(/^\//, '')}`;
  return `/${raw.replace(/^\//, '')}`;
}

export function getPreviewUrl(file: MediaFile): string {
  return file.thumbnail_url || file.preview_url || file.url || '';
}

export function formatBytes(size?: number): string {
  if (!size || size <= 0) return '';
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function getDocumentName(m: MediaFile): string {
  if (m.file?.name) return m.file.name;
  try {
    const raw = m.url || '';
    const last = raw.split('/').pop() || '';
    return decodeURIComponent(last) || 'Документ';
  } catch {
    return 'Документ';
  }
}

export function formatMembersCount(count?: number): string {
  if (typeof count !== 'number' || count <= 0) return '';

  const nf = new Intl.NumberFormat('ru-RU');
  const pr = new Intl.PluralRules('ru-RU');
  const rule = pr.select(count);
  const noun = rule === 'one' ? 'подписчик' : rule === 'few' ? 'подписчика' : 'подписчиков';
  return `${nf.format(count)} ${noun}`;
}

export function extractDocuments(mediaFiles: MediaFile[]): DocumentPreviewItem[] {
  return mediaFiles
    .filter((m) => m.type === 'document')
    .map((m) => ({
      id: m.id,
      name: getDocumentName(m),
      size: formatBytes(m.size ?? m.file?.size),
      url: m.url,
    }));
}

export function extractVisualMedia(
  mediaFiles: MediaFile[],
  objectUrls: Map<string, string>
): MediaPreviewItem[] {
  return mediaFiles
    .filter((m) => m.type === 'image' || m.type === 'video')
    .map((m) => ({
      id: m.id,
      type: m.type as 'image' | 'video',
      url: objectUrls.get(m.id) || getPreviewUrl(m),
      thumbnailUrl: m.thumbnail_url || undefined,
      blur: m.blur,
    }));
}

export function createMediaRuns(
  mediaFiles: MediaFile[],
  objectUrls: Map<string, string>
): MediaRun[] {
  const runs: MediaRun[] = [];

  const pushRun = (run: MediaRun | null) => {
    if (!run) return;
    if (run.kind === 'visual' && run.items.length === 0) return;
    if (run.kind === 'document' && run.items.length === 0) return;
    runs.push(run);
  };

  let current: MediaRun | null = null;

  for (const m of mediaFiles) {
    const kind: MediaRun['kind'] = (m.type === 'image' || m.type === 'video') ? 'visual' : 'document';

    if (!current || current.kind !== kind) {
      pushRun(current);
      current = kind === 'visual' ? { kind: 'visual', items: [] } : { kind: 'document', items: [] };
    }

    if (kind === 'visual') {
      (current as { kind: 'visual'; items: MediaPreviewItem[] }).items.push({
        id: m.id,
        type: m.type as 'image' | 'video',
        url: objectUrls.get(m.id) || getPreviewUrl(m),
        thumbnailUrl: m.thumbnail_url || undefined,
        blur: m.blur,
      });
    } else {
      (current as { kind: 'document'; items: DocumentPreviewItem[] }).items.push({
        id: m.id,
        name: getDocumentName(m),
        size: formatBytes(m.size ?? m.file?.size),
        url: m.url,
      });
    }
  }

  pushRun(current);
  return runs;
}

export async function createObjectUrls(mediaFiles: MediaFile[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  
  await Promise.all(
    mediaFiles.map(async (m) => {
      if (!m.file) return;
      
      if (m.type === 'image') {
        const compressed = await compressImageForPreview(m.file);
        map.set(m.id, compressed);
      } else if (m.type === 'video') {
        const thumbnail = await createVideoThumbnail(m.file);
        map.set(m.id, thumbnail);
      } else {
        map.set(m.id, URL.createObjectURL(m.file));
      }
    })
  );
  
  return map;
}

export function revokeObjectUrls(urls: Map<string, string>): void {
  if (!urls || typeof urls.values !== 'function') return;
  
  for (const url of urls.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export interface HtmlPart {
  type: 'text' | 'blockquote' | 'code';
  content: string;
  language?: string;
}

export function extractBlockquotes(html: string): { mainHtml: string; blockquotes: string[]; parts: HtmlPart[] } {
  if (!html) return { mainHtml: '', blockquotes: [], parts: [] };

  const parts: HtmlPart[] = [];
  const blockquotes: string[] = [];
  const combinedRegex = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>|<pre(?:\s+data-language="([^"]+)")?[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = combinedRegex.exec(html)) !== null) {
    const textBefore = html.slice(lastIndex, match.index).trim();
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }
    
    if (match[1] !== undefined) {
      const blockquoteContent = match[1].trim();
      if (blockquoteContent) {
        parts.push({ type: 'blockquote', content: blockquoteContent });
        blockquotes.push(blockquoteContent);
      }
    } else if (match[3] !== undefined) {
      const codeContent = match[3].trim();
      const language = match[2] || undefined;
      if (codeContent) {
        const decoded = codeContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        parts.push({ type: 'code', content: decoded, language });
      }
    }
    
    lastIndex = match.index + match[0].length;
  }

  const textAfter = html.slice(lastIndex).trim();
  if (textAfter) {
    parts.push({ type: 'text', content: textAfter });
  }

  const mainHtml = html.replace(combinedRegex, '').trim();
  
  return { mainHtml, blockquotes, parts };
}

export function extractUrls(html: string): string[] {
  if (!html) return [];
  
  const urls: string[] = [];
  const urlRegex = /https?:\/\/[^\s<>"]+/gi;
  const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;

  const rawMatches = html.match(urlRegex) || [];
  rawMatches.forEach((url) => {
    const cleanUrl = url.replace(/[.,;!?)]$/, '');
    if (!urls.includes(cleanUrl)) {
      urls.push(cleanUrl);
    }
  });

  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefRegex.exec(html)) !== null) {
    const cleanUrl = hrefMatch[1].replace(/[.,;!?)]$/, '');
    if (!urls.includes(cleanUrl)) {
      urls.push(cleanUrl);
    }
  }

  return urls;
}
