import type { Draft } from '@/app/[locale]/create-post/store/types';
import type { FilterConfig } from '../components/ListFilterBar';
import { getMediaFilterTypes, getStatusLabel, MEDIA_TYPE_LABELS } from './calendar-helpers';

interface FilterConfigOptions {
  withDateSort?: boolean;
  withStatusFilter?: boolean;
  withStatsFilters?: boolean;
  allChannels?: Array<{ id: number; title: string }>;
  allTags?: Array<{ id: number; name: string; color?: string }>;
}

export function buildFilterConfigs(posts: Draft[], opts: FilterConfigOptions = {}): FilterConfig[] {
  const channelMap = new Map<string, string>();
  const tagMap = new Map<string, { name: string; color?: string }>();
  const mediaSet = new Set<string>();

  if (opts.allChannels) {
    opts.allChannels.forEach((ch) => channelMap.set(String(ch.id), ch.title || `Канал ${ch.id}`));
  }
  if (opts.allTags) {
    opts.allTags.forEach((t) => tagMap.set(String(t.id), { name: t.name, color: t.color }));
  }

  posts.forEach((p) => {
    p.channels?.forEach((ch) => channelMap.set(String(ch.id), ch.title || `Канал ${ch.id}`));
    p.tags?.forEach((t) => tagMap.set(String(t.id), { name: t.name, color: t.color }));
    if (p.media_urls?.length) getMediaFilterTypes(p.media_urls).forEach((t) => mediaSet.add(t));
  });

  const configs: FilterConfig[] = [];

  if (opts.withDateSort) {
    configs.push({ key: 'date', label: 'По дате', multiSelect: false, options: [
      { value: 'new', label: 'Сначала новые' }, { value: 'old', label: 'Сначала старые' },
    ]});
  }
  if (opts.withStatusFilter) {
    configs.push({ key: 'status', label: 'По статусу', multiSelect: false, options:
      ['draft', 'scheduled', 'publishing', 'published', 'partial_success', 'failed', 'deleted']
        .map((s) => ({ value: s, label: getStatusLabel(s) })),
    });
  }
  if (channelMap.size > 0) {
    configs.push({ key: 'channel', label: 'По каналам', multiSelect: true,
      options: Array.from(channelMap.entries()).map(([id, title]) => ({ value: id, label: title })),
    });
  }
  if (tagMap.size > 0) {
    configs.push({ key: 'tag', label: 'По тегам', multiSelect: true,
      options: Array.from(tagMap.entries()).map(([id, { name }]) => ({ value: id, label: name })),
    });
  }
  if (mediaSet.size > 0) {
    configs.push({ key: 'media', label: 'По типу контента', multiSelect: true,
      options: Array.from(mediaSet).map((t) => ({ value: t, label: MEDIA_TYPE_LABELS[t] || t })),
    });
  }
  if (opts.withStatsFilters) {
    configs.push(
      { key: 'views', label: 'По просмотрам', multiSelect: false, options: [
        { value: 'gt1000', label: 'Более 1000' }, { value: '100to1000', label: '100 - 1000' }, { value: 'lt100', label: 'Менее 100' },
      ]},
      { key: 'reactions', label: 'По реакциям', multiSelect: false, options: [
        { value: 'gt100', label: 'Более 100' }, { value: '10to100', label: '10 - 100' }, { value: 'lt10', label: 'Менее 10' },
      ]},
    );
  }

  return configs;
}
