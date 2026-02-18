'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import {
  ArrowsSpinIcon,
  AudioIcon,
  CalendarReactionsIcon,
  CalendarViewsIcon,
  DocIcon,
  GifIcon,
  PhotoIcon,
  VideoIcon,
} from '@/components/icons';
import Loader from '@/components/loader';
import CalendarCard from './CalendarCard';
import ListFilterBar, { type FilterConfig } from './ListFilterBar';
import styles from './list-calendar-view.module.scss';

interface ListCalendarViewProps {
  posts: Draft[];
  isLoading: boolean;
  onEdit: (post: Draft) => void;
  isLoadingMore?: boolean;
  dateSortOrder: 'asc' | 'desc' | null;
  statusFilter: string | null;
  onDateSortChange: (order: 'asc' | 'desc' | null) => void;
  onStatusFilterChange: (status: string | null) => void;
  mobileFilterOpen: boolean;
  onMobileFilterOpenChange: (open: boolean) => void;
  mobileFilterAnchor: { bottom: number; right: number } | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getSourceDate(post: Draft): string {
  return ((post as any).scheduled_time || (post as any).published_at || post.updated_at || post.created_at);
}

function getPreviewText(post: Draft): string {
  const html = post.formatted_content?.html || post.formatted_content?.text || post.text_content || '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Запланирован';
    case 'published':
      return 'Опубликован';
    case 'publishing':
      return 'Публикуется';
    case 'partial_success':
      return 'Частично опубликован';
    case 'draft':
      return 'Черновик';
    case 'failed':
      return 'Ошибка';
    case 'deleted':
      return 'Удалён';
    default:
      return status;
  }
}

function hasRepeat(post: Draft): boolean {
  const value = (post as any).repeat_interval;
  return !!(value && value !== 'never');
}

function getMediaTypes(urls: string[]): Set<string> {
  const types = new Set<string>();
  for (const url of urls) {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
      types.add('photo');
    } else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      types.add('video');
    } else if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'wma'].includes(ext)) {
      types.add('audio');
    } else if (['gif'].includes(ext)) {
      types.add('gif');
    } else {
      types.add('doc');
    }
  }
  return types;
}

function formatCompact(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  if (value >= 1000000) {
    return `${Math.round(value / 100000) / 10}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}K`;
  }
  return String(value);
}

function MediaIcons({ post }: { post: Draft }) {
  const mediaTypes = post.media_urls?.length ? getMediaTypes(post.media_urls) : new Set<string>();
  return (
    <div className={styles.mediaIcons}>
      {mediaTypes.has('photo') && <PhotoIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('video') && <VideoIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('audio') && <AudioIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('doc') && <DocIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('gif') && <GifIcon width={18} height={18} color="#B0B4B8" />}
    </div>
  );
}

export default function ListCalendarView({
  posts,
  isLoading,
  onEdit,
  isLoadingMore = false,
  dateSortOrder,
  statusFilter,
  onDateSortChange,
  onStatusFilterChange,
  mobileFilterOpen,
  onMobileFilterOpenChange,
  mobileFilterAnchor,
}: ListCalendarViewProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    setActiveFilters((prev) => ({
      ...prev,
      date: dateSortOrder ? [dateSortOrder === 'desc' ? 'new' : 'old'] : [],
      status: statusFilter ? [statusFilter] : [],
    }));
  }, [dateSortOrder, statusFilter]);

  // Build filter options from posts data
  const filterConfigs: FilterConfig[] = React.useMemo(() => {
    const channelMap = new Map<string, string>();
    const tagMap = new Map<string, { name: string; color?: string }>();
    const mediaTypeSet = new Set<string>();

    const statusOptions = [
      { value: 'draft', label: getStatusLabel('draft') },
      { value: 'scheduled', label: getStatusLabel('scheduled') },
      { value: 'publishing', label: getStatusLabel('publishing') },
      { value: 'published', label: getStatusLabel('published') },
      { value: 'partial_success', label: getStatusLabel('partial_success') },
      { value: 'failed', label: getStatusLabel('failed') },
      { value: 'deleted', label: getStatusLabel('deleted') },
    ];

    posts.forEach((post) => {
      post.channels?.forEach((ch) => {
        channelMap.set(String(ch.id), ch.title || `Канал ${ch.id}`);
      });
      post.tags?.forEach((tag) => {
        tagMap.set(String(tag.id), { name: tag.name, color: tag.color });
      });
      if (post.media_urls?.length) {
        getMediaTypes(post.media_urls).forEach((t) => mediaTypeSet.add(t));
      }
    });

    const configs: FilterConfig[] = [];

    configs.push({
      key: 'date',
      label: 'По дате',
      multiSelect: false,
      options: [
        { value: 'new', label: 'Сначала новые' },
        { value: 'old', label: 'Сначала старые' },
      ],
    });

    configs.push({
      key: 'status',
      label: 'По статусу',
      multiSelect: false,
      options: statusOptions,
    });

    if (channelMap.size > 0) {
      configs.push({
        key: 'channel',
        label: 'По каналам',
        multiSelect: true,
        options: Array.from(channelMap.entries()).map(([id, title]) => ({
          value: id,
          label: title,
        })),
      });
    }

    if (tagMap.size > 0) {
      configs.push({
        key: 'tag',
        label: 'По тэгам',
        multiSelect: true,
        options: Array.from(tagMap.entries()).map(([id, { name, color }]) => ({
          value: id,
          label: name,
          color,
        })),
      });
    }

    const mediaTypeLabels: Record<string, string> = {
      photo: 'Фото',
      video: 'Видео',
      audio: 'Аудио',
      doc: 'Документ',
      gif: 'GIF',
    };

    if (mediaTypeSet.size > 0) {
      configs.push({
        key: 'media',
        label: 'По типу вложений',
        multiSelect: true,
        options: Array.from(mediaTypeSet).map((t) => ({
          value: t,
          label: mediaTypeLabels[t] || t,
        })),
      });
    }

    configs.push({
      key: 'views',
      label: 'По просмотрам',
      multiSelect: false,
      options: [
        { value: 'gt1000', label: 'Более 1000' },
        { value: '100to1000', label: '100 - 1000' },
        { value: 'lt100', label: 'Менее 100' },
      ],
    });

    configs.push({
      key: 'reactions',
      label: 'По реакциям',
      multiSelect: false,
      options: [
        { value: 'gt100', label: 'Более 100' },
        { value: '10to100', label: '10 - 100' },
        { value: 'lt10', label: 'Менее 10' },
      ],
    });

    return configs;
  }, [posts]);

  // Apply filters
  const filteredPosts = React.useMemo(() => {
    let next = posts.filter((post) => {
      // Channel filter
      const channelFilter = activeFilters['channel'];
      if (channelFilter?.length) {
        const postChannelIds = post.channels?.map((ch) => String(ch.id)) || [];
        if (!channelFilter.some((id) => postChannelIds.includes(id))) return false;
      }

      // Tag filter
      const tagFilter = activeFilters['tag'];
      if (tagFilter?.length) {
        const postTagIds = post.tags?.map((t) => String(t.id)) || [];
        if (!tagFilter.some((id) => postTagIds.includes(id))) return false;
      }

      // Media type filter
      const mediaFilter = activeFilters['media'];
      if (mediaFilter?.length) {
        const postMediaTypes = post.media_urls?.length ? getMediaTypes(post.media_urls) : new Set<string>();
        if (!mediaFilter.some((t) => postMediaTypes.has(t))) return false;
      }

      const viewsFilter = activeFilters['views'];
      if (viewsFilter?.length) {
        const views = Number((post as any).views_count ?? (post as any).views ?? 0);
        const ok = viewsFilter.some((v) =>
          (v === 'gt1000' && views > 1000) ||
          (v === '100to1000' && views >= 100 && views <= 1000) ||
          (v === 'lt100' && views < 100)
        );
        if (!ok) return false;
      }

      const reactionsFilter = activeFilters['reactions'];
      if (reactionsFilter?.length) {
        const reactions = Number((post as any).reactions_count ?? (post as any).likes_count ?? 0);
        const ok = reactionsFilter.some((v) =>
          (v === 'gt100' && reactions > 100) ||
          (v === '10to100' && reactions >= 10 && reactions <= 100) ||
          (v === 'lt10' && reactions < 10)
        );
        if (!ok) return false;
      }

      return true;
    });

    return next;
  }, [posts, activeFilters]);

  function handleFilterChange(key: string, values: string[]) {
    if (key === 'date') {
      const value = values[0] || null;
      onDateSortChange(value === 'new' ? 'desc' : value === 'old' ? 'asc' : null);
    }

    if (key === 'status') {
      onStatusFilterChange(values[0] || null);
    }

    setActiveFilters((prev) => ({ ...prev, [key]: values }));
  }

  if (isLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.empty}>Нет публикаций в этом периоде</div>
    );
  }

  return (
    <>
      <div className={styles.mobileMiniTabs}>
        {[
          { key: 'all', label: 'Все', status: null as string | null },
          { key: 'scheduled', label: 'Запланированные', status: 'scheduled' as string | null },
          { key: 'published', label: 'Опубликованные', status: 'published' as string | null },
        ].map((tab) => {
          const isActive = (statusFilter || null) === tab.status;
          return (
            <button
              key={tab.key}
              type="button"
              className={isActive ? `${styles.mobileMiniTab} ${styles.mobileMiniTabActive}` : styles.mobileMiniTab}
              onClick={() => {
                onStatusFilterChange(tab.status);
                setActiveFilters((prev) => ({ ...prev, status: tab.status ? [tab.status] : [] }));
              }}
            >
              <span className={styles.mobileMiniTabText}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {filterConfigs.length > 0 && (
        <div className={styles.filterBarWrap}>
          <ListFilterBar
            filters={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            mobileFilterOpen={mobileFilterOpen}
            onMobileFilterOpenChange={onMobileFilterOpenChange}
            mobilePopupAnchor={mobileFilterAnchor}
            hideMobileTrigger
          />
        </div>
      )}

      <div className={styles.desktopList}>
        {filteredPosts.map((post) => {
          const sourceDate = getSourceDate(post);
          const channel = post.channels?.[0];
          const extraChannelsCount = post.channels?.length > 1 ? post.channels.length - 1 : 0;
          const preview = getPreviewText(post);
          const tags = post.tags || [];
          const views = (post as any).views_count ?? (post as any).views;
          const reactions = (post as any).reactions_count ?? (post as any).likes_count;

          return (
            <div
              key={post.id}
              className={styles.row}
              onClick={() => onEdit(post)}
            >
              <div className={styles.leftBlock}>
                <div className={styles.dateTime}>
                  <span className={styles.date}>{formatDate(sourceDate)}</span>
                  <span className={styles.time}>{formatTime(sourceDate)}</span>
                </div>
                <div className={styles.tagsWrap}>
                  {tags.slice(0, 2).map((tag) => (
                    <span key={tag.id} className={styles.tag} style={{ backgroundColor: tag.color || '#B8DBF1' }}>
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className={styles.tagsMore}>+{tags.length - 2}</span>
                  )}
                </div>
              </div>

              <div className={styles.mainBlock}>
                <span className={styles.channelTitle}>
                  {channel?.title || 'Канал'}{extraChannelsCount > 0 ? ` +${extraChannelsCount}` : ''}
                </span>
                <span className={styles.preview}>{preview || '(без текста)'}</span>
              </div>

              <MediaIcons post={post} />

              <div className={styles.statusBlock}>
                <span className={styles.status}>{getStatusLabel(post.status)}</span>
                {hasRepeat(post) && <ArrowsSpinIcon width={14} height={14} color="#B0B4B8" />}
              </div>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <CalendarViewsIcon width={12} height={12} color="#B0B4B8" />
                  <span className={styles.statValue}>{formatCompact(views)}</span>
                </div>
                <div className={styles.statItem}>
                  <CalendarReactionsIcon width={12} height={12} color="#B0B4B8" />
                  <span className={styles.statValue}>{formatCompact(reactions)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {isLoadingMore && (
          <div className={styles.listLoader}>
            <Loader size={18} color="blue" />
          </div>
        )}
      </div>

      <div className={styles.mobileList}>
        <div className={styles.mobileListInner}>
          {filteredPosts.map((post) => (
            <CalendarCard
              key={post.id}
              post={post}
              onEdit={() => onEdit(post)}
              listMode
            />
          ))}

          {isLoadingMore && (
            <div className={styles.listLoaderMobile}>
              <Loader size={18} color="blue" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
