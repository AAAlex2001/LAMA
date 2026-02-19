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
import Button from '@/components/button/button';
import CalendarCard from './CalendarCard';
import ListFilterBar from './ListFilterBar';
import { buildFilterConfigs } from '../utils/buildFilterConfigs';
import { applyPostFilters } from '../utils/filterPosts';
import {
  formatDateDot,
  formatTime,
  getSourceDate,
  getPreviewText,
  getStatusLabel,
  hasRepeat,
  formatCompact,
  getMediaFilterTypes,
} from '../utils/calendar-helpers';
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
}

function MediaIcons({ post }: { post: Draft }) {
  const mediaTypes = post.media_urls?.length ? getMediaFilterTypes(post.media_urls) : new Set<string>();
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
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  dateSortOrder,
  statusFilter,
  onDateSortChange,
  onStatusFilterChange,
  mobileActiveFilters,
}: ListCalendarViewProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});

  const filterConfigs = React.useMemo(
    () => buildFilterConfigs(posts, { withDateSort: true, withStatusFilter: true, withStatsFilters: true }),
    [posts],
  );
  const filteredPosts = React.useMemo(
    () => applyPostFilters(posts, activeFilters, mobileActiveFilters),
    [posts, activeFilters, mobileActiveFilters],
  );

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
          const views = post.views_count ?? post.views;
          const reactions = post.reactions_count ?? post.likes_count;

          return (
            <div
              key={post.id}
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
        {!isLoadingMore && hasMore && onLoadMore && (
          <div className={styles.listLoader}>
            <Button
              text="Загрузить ещё"
              showArrow={false}
              active
              size="small"
              onClick={onLoadMore}
            />
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
          {!isLoadingMore && hasMore && onLoadMore && (
            <div className={styles.listLoaderMobile}>
              <Button
                text="Загрузить ещё"
                showArrow={false}
                active
                size="small"
                onClick={onLoadMore}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
