import type { Draft } from '@/app/[locale]/create-post/store/types';
import { getMediaFilterTypes } from './calendar-helpers';

export function applyPostFilters(
  posts: Draft[],
  activeFilters: Record<string, string[]>,
  externalFilters?: Record<string, string[]>,
): Draft[] {
  const merged = { ...activeFilters };
  if (externalFilters) {
    for (const [k, v] of Object.entries(externalFilters)) {
      if (v?.length) merged[k] = v;
    }
  }

  return posts.filter((post) => {
    const statusFilter = merged['status']?.[0];
    if (statusFilter && post.status !== statusFilter) return false;

    const channelFilter = merged['channel'];
    if (channelFilter?.length) {
      const ids = post.channels?.map((ch) => String(ch.id)) || [];
      if (!channelFilter.some((id) => ids.includes(id))) return false;
    }

    const tagFilter = merged['tag'];
    if (tagFilter?.length) {
      const ids = post.tags?.map((t) => String(t.id)) || [];
      if (!tagFilter.some((id) => ids.includes(id))) return false;
    }

    const mediaFilter = merged['media'];
    if (mediaFilter?.length) {
      const types = post.media_urls?.length ? getMediaFilterTypes(post.media_urls) : new Set<string>();
      if (!mediaFilter.some((t) => types.has(t))) return false;
    }

    const viewsFilter = merged['views'];
    if (viewsFilter?.length) {
      const views = Number(post.views_count ?? post.views ?? 0);
      if (!viewsFilter.some((v) =>
        (v === 'gt1000' && views > 1000) || (v === '100to1000' && views >= 100 && views <= 1000) || (v === 'lt100' && views < 100),
      )) return false;
    }

    const reactionsFilter = merged['reactions'];
    if (reactionsFilter?.length) {
      const reactions = Number(post.reactions_count ?? post.likes_count ?? 0);
      if (!reactionsFilter.some((v) =>
        (v === 'gt100' && reactions > 100) || (v === '10to100' && reactions >= 10 && reactions <= 100) || (v === 'lt10' && reactions < 10),
      )) return false;
    }

    return true;
  });
}
