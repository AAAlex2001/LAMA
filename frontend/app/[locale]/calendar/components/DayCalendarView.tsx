'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import CalendarCard from './CalendarCard';
import ListFilterBar from './ListFilterBar';
import { buildFilterConfigs } from '../utils/buildFilterConfigs';
import { applyPostFilters } from '../utils/filterPosts';
import styles from './day-calendar-view.module.scss';

interface DayCalendarViewProps {
  posts: Draft[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  selectedDate: Date;
  mobileActiveFilters?: Record<string, string[]>;
}

export default function DayCalendarView({
  posts,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onEdit,
  onAddPost,
  selectedDate,
  mobileActiveFilters,
}: DayCalendarViewProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const wasLoadingRef = React.useRef(false);
  const savedScrollRef = React.useRef(0);

  const filterConfigs = React.useMemo(() => buildFilterConfigs(posts, {}), [posts]);
  const filteredPosts = React.useMemo(
    () => applyPostFilters(posts, activeFilters, mobileActiveFilters),
    [posts, activeFilters, mobileActiveFilters],
  );
  const handleFilterChange = React.useCallback(
    (key: string, values: string[]) => setActiveFilters((prev) => ({ ...prev, [key]: values })),
    [],
  );

  function handleStatusChange(status: string | null) {
    handleFilterChange('status', status ? [status] : []);
  }

  React.useEffect(() => {
    if (wasLoadingRef.current && !isLoadingMore) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = savedScrollRef.current;
      }
    }
    wasLoadingRef.current = isLoadingMore;
  }, [isLoadingMore]);

  React.useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    let hasSeenExit = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (!entry.isIntersecting) {
          hasSeenExit = true;
          return;
        }

        if (!hasSeenExit) return;
        if (isLoadingMore) return;

        savedScrollRef.current = container.scrollTop;
        onLoadMore();
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore]);

  if (isLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <div className={styles.dayWrap}>
      <div className={styles.mobileControls}>
        <div className={styles.mobileMiniTabs}>
          {[
            { key: 'all', label: 'Все', status: null as string | null },
            { key: 'scheduled', label: 'Запланированные', status: 'scheduled' as string | null },
            { key: 'published', label: 'Опубликованные', status: 'published' as string | null },
          ].map((tab) => {
            const activeStatus = activeFilters['status']?.[0] || null;
            const isActive = activeStatus === tab.status;
            return (
              <button
                key={tab.key}
                type="button"
                className={isActive ? `${styles.mobileMiniTab} ${styles.mobileMiniTabActive}` : styles.mobileMiniTab}
                onClick={() => handleStatusChange(tab.status)}
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

        <div className={styles.createWrap}>
          <Button
            text="Создать публикацию"
            showArrow={false}
            active
            className={styles.createBtn}
            onClick={() => onAddPost(selectedDate)}
          />
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className={styles.empty}>Нет публикаций на этот день</div>
      ) : (
        <div className={styles.scrollContainer} ref={scrollContainerRef}>
          <div className={styles.list}>
            {filteredPosts.map((post) => (
              <CalendarCard
                key={post.id}
                post={post}
                onEdit={() => onEdit(post)}
              />
            ))}
          </div>
          {isLoadingMore && (
            <div className={styles.listLoader}>
              <Loader size={20} color="blue" />
            </div>
          )}
          {hasMore && !isLoadingMore && (
            <div ref={sentinelRef} className={styles.scrollSentinel} />
          )}
        </div>
      )}
    </div>
  );
}
