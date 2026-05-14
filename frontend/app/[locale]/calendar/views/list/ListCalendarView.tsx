'use client';

import React from 'react';
import type { Draft } from '@/types/post';
import {
  AudioIcon,
  CalendarCommentsIcon,
  CalendarReactionsIcon,
  CalendarRepeatIcon,
  CalendarViewsIcon,
  DocIcon,
  GifIcon,
  PhotoIcon,
  QuizIcon,
  VideoIcon,
  CalendarBotMessageIcon,
  WalletAdIcon,
} from '@/components/icons';
import Loader from '@/components/loader';
import CalendarCard from '../../shared/CalendarCard';
import ListFilterBar from './ListFilterBar';
import { buildFilterConfigs } from '../../utils/buildFilterConfigs';
import { applyPostFilters } from '../../utils/filterPosts';
import {
  formatDateDot,
  formatTime,
  getSourceDate,
  getPreviewText,
  getStatusLabel,
  hasRepeat,
  formatCompact,
  getMediaFilterTypes,
} from '../../utils/calendar-helpers';
import { useInView } from '@/hooks/useInView';
import styles from './list-calendar-view.module.scss';

interface ListCalendarViewProps {
  posts: Draft[];
  isLoading: boolean;
  onEdit: (post: Draft) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  dateSortOrder: 'asc' | 'desc' | null;
  statusFilter: string | null;
  onDateSortChange: (order: 'asc' | 'desc' | null) => void;
  onStatusFilterChange: (status: string | null) => void;
  mobileActiveFilters?: Record<string, string[]>;
  allChannels?: Array<{ id: number; title: string }>;
  allTags?: Array<{ id: number; name: string; color?: string }>;
}

function MediaIcons({ post }: { post: Draft }) {
  const mediaTypes = post.media_urls?.length ? getMediaFilterTypes(post.media_urls) : new Set<string>();
  const hasQuiz = !!post.poll_data?.question;
  return (
    <div className={styles.mediaIcons}>
      {mediaTypes.has('photo') && <PhotoIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('video') && <VideoIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('audio') && <AudioIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('doc') && <DocIcon width={18} height={18} color="#B0B4B8" />}
      {mediaTypes.has('gif') && <GifIcon width={18} height={18} color="#B0B4B8" />}
      {hasQuiz && <QuizIcon width={18} height={18} color="#B0B4B8" />}
    </div>
  );
}

export default function ListCalendarView({
  posts,
  isLoading,
  onEdit,
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  dateSortOrder,
  statusFilter,
  onDateSortChange,
  onStatusFilterChange,
  mobileActiveFilters,
  allChannels,
  allTags,
}: ListCalendarViewProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
  const [scrollRootEl, setScrollRootEl] = React.useState<HTMLDivElement | null>(null);

  const loadingRef = React.useRef(isLoadingMore);
  loadingRef.current = isLoadingMore;
  const hasMoreRef = React.useRef(hasMore);
  hasMoreRef.current = hasMore;
  const onLoadMoreRef = React.useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const { ref: sentinelRef, inView } = useInView({
    root: scrollRootEl,
    rootMargin: '0px 0px 400px 0px',
    threshold: 0,
    skip: !hasMore || isLoadingMore || !scrollRootEl,
    onChange(inView) {
      if (inView && hasMoreRef.current && !loadingRef.current) {
        onLoadMoreRef.current?.();
      }
    },
  });

  const filterConfigs = buildFilterConfigs(posts, {
    withDateSort: true,
    withStatusFilter: true,
    withStatsFilters: true,
    allChannels,
    allTags,
  });


  let filteredPosts = applyPostFilters(posts, activeFilters, mobileActiveFilters);

  const dateSort = activeFilters['date']?.[0];
  if (dateSort) {
    const dir = dateSort === 'new' ? -1 : 1;
    filteredPosts = [...filteredPosts].sort(
      (a, b) => dir * (new Date(getSourceDate(a)).getTime() - new Date(getSourceDate(b)).getTime()),
    );
  }

  React.useEffect(() => {
    setActiveFilters((prev) => ({ ...prev, date: dateSortOrder ? [dateSortOrder === 'desc' ? 'new' : 'old'] : [] }));
  }, [dateSortOrder]);

  React.useEffect(() => {
    setActiveFilters((prev) => ({ ...prev, status: statusFilter ? [statusFilter] : [] }));
  }, [statusFilter]);

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

  const hasAnyFilter = Object.values(activeFilters).some((v) => v.length > 0)
    || Object.values(mobileActiveFilters || {}).some((v) => v.length > 0);

  const showInitialLoader = isLoading && filteredPosts.length === 0;
  const showEmpty = !isLoading && filteredPosts.length === 0;

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
            hideMobileTrigger
          />
        </div>
      )}

      <div className={styles.scrollContainer} ref={setScrollRootEl}>
        {showInitialLoader && (
          <div className={styles.loaderWrap}>
            <Loader size={32} color="blue" />
          </div>
        )}

        {showEmpty && (
          <div className={styles.empty}>
            {hasAnyFilter ? 'Нет публикаций по выбранным фильтрам' : 'Нет публикаций в этом периоде'}
          </div>
        )}

        <div className={styles.desktopList}>
          {filteredPosts.map((post, index) => {
            const sourceDate = getSourceDate(post);
            const channel = post.channels?.[0];
            const extraChannelsCount = post.channels?.length > 1 ? post.channels.length - 1 : 0;
            const preview = getPreviewText(post);
            const tags = post.tags || [];
            const views = post.views_count ?? post.views;
            const reactions = post.reactions_count ?? post.likes_count;
            const comments = post.comments_count ?? 0;

            const isSeries = (post.series_count ?? 0) > 1;

            const rowKey = `${post.id}-${post.series_id ?? 'single'}-${getSourceDate(post)}-${index}`;
            return (
              <div
                key={rowKey}
                className={styles.row}
                onClick={() => onEdit(post)}
              >
                <div className={styles.leftBlock}>
                  <div className={styles.dateTime}>
                    <span className={styles.date}>{formatDateDot(sourceDate)}</span>
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
                    {post.is_bot_message
                      ? `@${post.bot_username}`
                      : `${channel?.title || 'Канал'}${extraChannelsCount > 0 ? ` +${extraChannelsCount}` : ''}`}
                  </span>
                  <span className={styles.preview}>{preview || '(без текста)'}</span>
                </div>

                <MediaIcons post={post} />

                <div className={styles.statusBlock}>
                  {post.is_ad && <WalletAdIcon width={14} height={14} />}
                  {post.is_bot_message && <CalendarBotMessageIcon width={14} height={14} />}
                  <span className={styles.status}>{getStatusLabel(post.status)}</span>
                  {hasRepeat(post) && <CalendarRepeatIcon width={14} height={14} color="#3B82F6" />}
                  {isSeries && <span className={styles.seriesBadge}>Серия · {post.series_count}</span>}
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
                  <div className={styles.statItem}>
                    <CalendarCommentsIcon width={12} height={12} color="#B0B4B8" />
                    <span className={styles.statValue}>{formatCompact(comments)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.mobileList}>
          <div className={styles.mobileListInner}>
            {filteredPosts.map((post, index) => (
              <CalendarCard
                key={`${post.id}-${post.series_id ?? 'single'}-${getSourceDate(post)}-${index}`}
                post={post}
                onEdit={() => onEdit(post)}
                listMode
              />
            ))}
          </div>
        </div>

        {isLoadingMore && (
          <div className={styles.listLoader}>
            <Loader size={18} color="blue" />
          </div>
        )}
        {hasMore && filteredPosts.length > 0 && <div ref={sentinelRef} style={{ height: 1 }} />}
      </div>
    </>
  );
}
