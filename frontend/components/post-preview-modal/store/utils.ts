import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import type { DocumentPreviewItem, MediaPreviewItem } from './types';

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
      size: formatBytes(m.file?.size),
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
