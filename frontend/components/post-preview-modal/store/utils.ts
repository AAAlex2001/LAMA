import type { MediaFile } from '@/components/media-preview';
import type { DocumentPreviewItem, MediaPreviewItem } from './types';

export type MediaRun =
  | { kind: 'visual'; items: MediaPreviewItem[] }
  | { kind: 'document'; items: DocumentPreviewItem[] };

/**
 * Нормализует URL (относительный -> абсолютный)
 */
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

/**
 * Получает превью URL для медиафайла
 */
export function getPreviewUrl(file: MediaFile): string {
  return file.thumbnail_url || file.preview_url || file.url || '';
}

/**
 * Форматирует размер файла в человекочитаемый формат
 */
export function formatBytes(size?: number): string {
  if (!size || size <= 0) return '';
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Извлекает имя файла из MediaFile
 */
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

/**
 * Форматирует количество подписчиков с правильными окончаниями
 */
export function formatMembersCount(count?: number): string {
  if (typeof count !== 'number' || count <= 0) return '';

  const nf = new Intl.NumberFormat('ru-RU');
  const pr = new Intl.PluralRules('ru-RU');
  const rule = pr.select(count);
  const noun = rule === 'one' ? 'подписчик' : rule === 'few' ? 'подписчика' : 'подписчиков';
  return `${nf.format(count)} ${noun}`;
}

/**
 * Преобразует MediaFile[] в DocumentPreviewItem[]
 */
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

/**
 * Преобразует MediaFile[] в MediaPreviewItem[] (только визуальные)
 */
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

/**
 * Группирует медиа в последовательные "прогоны" (visual/document), сохраняя порядок.
 * Нужен для предпросмотра, чтобы он повторял порядок отправки в Telegram.
 */
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

/**
 * Создает Map с object URLs для файлов
 */
export function createObjectUrls(mediaFiles: MediaFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of mediaFiles) {
    if (m.file) {
      map.set(m.id, URL.createObjectURL(m.file));
    }
  }
  return map;
}

/**
 * Освобождает blob URLs
 */
export function revokeObjectUrls(urls: Map<string, string>): void {
  for (const url of urls.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Извлекает содержимое blockquote и pre/code из HTML и возвращает отдельно с сохранением порядка
 * Возвращает массив элементов с типом ('text' | 'blockquote' | 'code') и содержимым
 */
export interface HtmlPart {
  type: 'text' | 'blockquote' | 'code';
  content: string;
  language?: string; // для code блоков
}

export function extractBlockquotes(html: string): { mainHtml: string; blockquotes: string[]; parts: HtmlPart[] } {
  if (!html) return { mainHtml: '', blockquotes: [], parts: [] };

  const parts: HtmlPart[] = [];
  const blockquotes: string[] = [];
  
  // Комбинированный regex для blockquote и pre/code блоков
  // Ищем: <blockquote>...</blockquote> или <pre><code>...</code></pre> или <pre>...</pre>
  const combinedRegex = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>|<pre[^>]*>(?:<code[^>]*(?:\s+class="language-(\w+)")?[^>]*>)?([\s\S]*?)(?:<\/code>)?<\/pre>/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = combinedRegex.exec(html)) !== null) {
    // Текст до найденного блока
    const textBefore = html.slice(lastIndex, match.index).trim();
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }
    
    if (match[1] !== undefined) {
      // Это blockquote
      const blockquoteContent = match[1].trim();
      if (blockquoteContent) {
        parts.push({ type: 'blockquote', content: blockquoteContent });
        blockquotes.push(blockquoteContent);
      }
    } else if (match[3] !== undefined) {
      // Это pre/code блок
      const codeContent = match[3].trim();
      const language = match[2] || undefined;
      if (codeContent) {
        // Декодируем HTML entities
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
  
  // Текст после последнего блока
  const textAfter = html.slice(lastIndex).trim();
  if (textAfter) {
    parts.push({ type: 'text', content: textAfter });
  }
  
  // mainHtml для обратной совместимости
  const mainHtml = html.replace(combinedRegex, '').trim();
  
  return { mainHtml, blockquotes, parts };
}
