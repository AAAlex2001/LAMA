import type { Draft } from '@/types/post';

/**
 * Сворачивает посты одной серии в одну карточку с series_count = N.
 * Посты без series_id остаются как есть.
 */
export function groupSeriesPosts(items: Draft[]): Draft[] {
  const result: Draft[] = [];
  const seriesSeen = new Map<number, Draft>();

  for (const item of items) {
    if (!item.series_id) {
      result.push(item);
      continue;
    }

    const existing = seriesSeen.get(item.series_id);
    if (!existing) {
      const grouped = { ...item, series_count: 1 };
      seriesSeen.set(item.series_id, grouped);
      result.push(grouped);
    } else {
      existing.series_count = (existing.series_count ?? 1) + 1;
    }
  }

  return result;
}
