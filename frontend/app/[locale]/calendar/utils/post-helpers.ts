import type { Draft } from '@/types/post';

export function getSourceDate(post: Draft): string {
  return post.scheduled_time || post.updated_at || post.created_at;
}

export function sortPostsByTime(posts: Draft[], order: 'asc' | 'desc' = 'desc'): Draft[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...posts].sort(
    (a, b) => dir * (new Date(getSourceDate(a)).getTime() - new Date(getSourceDate(b)).getTime()),
  );
}

export function getPreviewText(post: Draft): string {
  const html = post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function getPreviewHtml(post: Draft): string {
  return post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'Запланирован', published: 'Опубликован',
    partial_success: 'Частично опубликован', draft: 'Черновик',
    failed: 'Ошибка', deleted: 'Удалён',
  };
  return labels[status] || status;
}

export function hasRepeat(post: Draft): boolean {
  return !!(post.repeat_interval && post.repeat_interval !== 'never');
}

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

export function formatCompact(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}
