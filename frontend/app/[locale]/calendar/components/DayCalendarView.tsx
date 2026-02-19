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
  onLoadMore,
  onEdit,
  onAddPost,
  selectedDate,
  mobileActiveFilters,
}: DayCalendarViewProps) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
  const listRef = React.useRef<HTMLDivElement>(null);
  const nearBottomRef = React.useRef(false);

  const filterConfigs = React.useMemo(() => buildFilterConfigs(posts, {}), [posts]);
  const filteredPosts = React.useMemo(
    () => applyPostFilters(posts, activeFilters, mobileActiveFilters),
    [posts, activeFilters, mobileActiveFilters],
  );
  const handleFilterChange = React.useCallback(
    (key: string, values: string[]) => setActiveFilters((prev) => ({ ...prev, [key]: values })),
    [],
  );

  const handleScroll = React.useCallback(() => {
    const list = listRef.current;
    if (!list || !onLoadMore || isLoadingMore) return;

    const dist = list.scrollHeight - list.scrollTop - list.clientHeight;
    const nearBottom = dist <= 24;
    if (nearBottom && !nearBottomRef.current) {
      nearBottomRef.current = true;
      onLoadMore();
    }
    if (dist > 96) {
      nearBottomRef.current = false;
    }
  }, [onLoadMore, isLoadingMore]);

  React.useEffect(() => {
    handleScroll();
  }, [filteredPosts.length, handleScroll]);

  function handleStatusChange(status: string | null) {
    handleFilterChange('status', status ? [status] : []);
  }

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
        <div className={styles.list} ref={listRef} onScroll={handleScroll}>
          {filteredPosts.map((post) => (
            <CalendarCard
              key={post.id}
              post={post}
              onEdit={() => onEdit(post)}
            />
          ))}
          {isLoadingMore && (
            <div className={styles.listLoader}>
              <Loader size={20} color="blue" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
