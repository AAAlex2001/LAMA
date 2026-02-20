'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import ListFilterBar from './ListFilterBar';
import { buildFilterConfigs } from '../utils/buildFilterConfigs';
import { applyPostFilters } from '../utils/filterPosts';
import {
  formatTime,
  getSourceDate,
  getPreviewText,
  formatDateOnly,
} from '../utils/calendar-helpers';
import styles from './month-calendar-view.module.scss';

interface MonthCalendarViewProps {
  selectedDate: Date;
  sidebarDate: Date;
  onSidebarDateChange: (date: Date) => void;
  weekItems: Record<string, Draft[]>;
  gridPostCounts: Record<string, number>;
  onMonthChange: (date: Date) => void;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  isLoading: boolean;
  onLoadMoreDay: (dateKey: string) => void;
  dayLoadingMap: Record<string, boolean>;
  dayHasMoreMap: Record<string, boolean>;
  mobileActiveFilters?: Record<string, string[]>;
}

function PostStatusIcon({ status }: { status: string }) {
  if (status === 'published') {
    return <CalendarSidebarSentIcon width={16} height={16} color="#34C759" />;
  }
  return <CalendarSidebarPostIcon width={16} height={16} color="#3B82F6" />;
}

export default function MonthCalendarView({
  selectedDate,
  sidebarDate,
  onSidebarDateChange,
  weekItems,
  gridPostCounts,
  onMonthChange,
  onEdit,
  onAddPost,
  isLoading,
  onLoadMoreDay,
  dayLoadingMap,
  dayHasMoreMap,
  mobileActiveFilters,
}: MonthCalendarViewProps) {
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const wasLoadingRef = React.useRef(false);
  const savedScrollRef = React.useRef(0);

  const dayKey = formatDateOnly(sidebarDate);
  const dayPosts = weekItems[dayKey] || [];

  const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
  const filterConfigs = React.useMemo(() => buildFilterConfigs(dayPosts, {}), [dayPosts]);
  const allFilteredPosts = React.useMemo(
    () => applyPostFilters(dayPosts, activeFilters, mobileActiveFilters),
    [dayPosts, activeFilters, mobileActiveFilters],
  );
  const handleFilterChange = React.useCallback(
    (key: string, values: string[]) => setActiveFilters((prev) => ({ ...prev, [key]: values })),
    [],
  );
  const filteredPosts = React.useMemo(() => {
    if (!statusFilter) return allFilteredPosts;
    return allFilteredPosts.filter((p) => p.status === statusFilter);
  }, [allFilteredPosts, statusFilter]);

  React.useEffect(() => {
    const isDayLoading = !!dayLoadingMap[dayKey];
    if (wasLoadingRef.current && !isDayLoading) {
      const container = scrollContainerRef.current || (scrollContainerRef.current = document.querySelector('main'));
      if (container) container.scrollTop = savedScrollRef.current;
    }
    wasLoadingRef.current = isDayLoading;
  }, [dayLoadingMap, dayKey]);

  React.useEffect(() => {
    const isDayLoading = !!dayLoadingMap[dayKey];
    const hasDayMore = !!dayHasMoreMap[dayKey];
    if (!hasDayMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

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
        if (isDayLoading) return;

        const container = scrollContainerRef.current || (scrollContainerRef.current = document.querySelector('main'));
        savedScrollRef.current = container?.scrollTop ?? 0;
        onLoadMoreDay(dayKey);
      },
      { root: null, rootMargin: '0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [dayKey, dayLoadingMap, dayHasMoreMap, onLoadMoreDay]);

  if (isLoading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <div className={styles.monthWrap}>
      <div className={styles.calendarCard}>
        <DatePicker
          value={sidebarDate}
          onChange={onSidebarDateChange}
          onMonthChange={onMonthChange}
          locale="ru"
          minDate={null}
          postCounts={gridPostCounts}
          className={styles.monthDatePicker}
        />
      </div>

      <div className={styles.postsCard}>
        <div className={styles.createWrap}>
          <Button
            text="Создать публикацию"
            showArrow={false}
            active
            className={styles.createBtn}
            onClick={() => onAddPost(sidebarDate)}
          />
        </div>

        <div className={styles.statusTabs}>
            {[
              { key: null as string | null, label: 'Все' },
              { key: 'scheduled' as string | null, label: 'Запланированные' },
              { key: 'published' as string | null, label: 'Опубликованные' },
            ].map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                className={statusFilter === tab.key ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
                onClick={() => setStatusFilter(tab.key)}
              >
                <span className={styles.statusTabText}>{tab.label}</span>
              </button>
            ))}
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

        <div className={styles.postList}>
          {filteredPosts.length === 0 ? (
            <div className={styles.empty}>Нет публикаций</div>
          ) : (
            filteredPosts.map((post) => {
              const sourceDate = getSourceDate(post);
              const time = formatTime(sourceDate);
              const preview = getPreviewText(post);
              return (
                <div
                  key={post.id}
                  className={styles.postRow}
                  onClick={() => onEdit(post)}
                >
                  <PostStatusIcon status={post.status} />
                  <span className={styles.postTime}>{time}</span>
                  <span className={styles.postPreview}>{preview || '(без текста)'}</span>
                </div>
              );
            })
          )}
          {dayLoadingMap[dayKey] && (
            <div className={styles.loadMoreWrap}>
              <Loader size={20} color="blue" />
            </div>
          )}
          {!!dayHasMoreMap[dayKey] && !dayLoadingMap[dayKey] && (
            <div ref={sentinelRef} className={styles.scrollSentinel} />
          )}
        </div>
      </div>
    </div>
  );
}
