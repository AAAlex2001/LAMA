import type { Draft } from '@/app/[locale]/create-post/store/types';

/** Наиболее релевантная дата для отображения */
export function getSourceDate(post: Draft): string {
  if (post.status === 'scheduled') return post.scheduled_time || post.created_at;
  return post.published_at || post.updated_at || post.created_at;
}

/** Убрать HTML-теги, вернуть plain text */
export function getPreviewText(post: Draft): string {
  const html = post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Получить HTML-контент для рендера */
export function getPreviewHtml(post: Draft): string {
  return post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'Запланирован', published: 'Опубликован', publishing: 'Публикуется',
    partial_success: 'Частично опубликован', draft: 'Черновик',
    failed: 'Ошибка', deleted: 'Удалён',
  };
  return labels[status] || status;
}

export function hasRepeat(post: Draft): boolean {
  return !!(post.repeat_interval && post.repeat_interval !== 'never');
}

/** Первый доступный thumbnail */
export function getThumbnail(post: Draft): string | null {
  const thumb = post.media_thumbnail_urls?.find((u) => u);
  if (thumb) return thumb;
  if (post.media_urls?.length) {
    const exts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
    const img = post.media_urls.find((url) => exts.includes(url.split('.').pop()?.toLowerCase() || ''));
    if (img) return img;
  }
  return null;
}

/** Сортировка постов по дате (asc) */
export function sortPostsByTime(posts: Draft[]): Draft[] {
  return [...posts].sort(
    (a, b) => new Date(getSourceDate(a)).getTime() - new Date(getSourceDate(b)).getTime(),
  );
}

/** 1500 → "1.5K", 2000000 → "2M" */
export function formatCompact(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}
