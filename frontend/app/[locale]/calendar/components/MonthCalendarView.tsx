'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon, FilterSortIcon, ChevronDownIcon } from '@/components/icons';
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
  listSortOrder: 'asc' | 'desc' | null;
  onListSortChange: (order: 'asc' | 'desc' | null) => void;
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
  listSortOrder,
  onListSortChange,
  onLoadMoreDay,
  dayLoadingMap,
  dayHasMoreMap,
  mobileActiveFilters,
}: MonthCalendarViewProps) {
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [sortPopupOpen, setSortPopupOpen] = React.useState(false);
  const sortWrapperRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement | null>(null);
  const dayScrollRestoreRef = React.useRef<{ pending: boolean; sawLoading: boolean; top: number }>({
    pending: false,
    sawLoading: false,
    top: 0,
  });

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
    if (!sortPopupOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (sortWrapperRef.current && !sortWrapperRef.current.contains(e.target as Node)) {
        setSortPopupOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortPopupOpen]);

  React.useEffect(() => {
    const restore = dayScrollRestoreRef.current;
    if (!restore.pending) return;
    const isDayLoading = !!dayLoadingMap[dayKey];
    if (isDayLoading) {
      restore.sawLoading = true;
      return;
    }
    if (restore.sawLoading) {
      const main = mainRef.current || (mainRef.current = document.querySelector('main'));
      if (main) {
        main.scrollTop = restore.top;
      }
      restore.pending = false;
      restore.sawLoading = false;
    }
  }, [dayKey, dayLoadingMap]);

  const handleLoadMoreDay = React.useCallback(() => {
    const main = mainRef.current || (mainRef.current = document.querySelector('main'));
    dayScrollRestoreRef.current.pending = true;
    dayScrollRestoreRef.current.sawLoading = false;
    dayScrollRestoreRef.current.top = main?.scrollTop ?? 0;
    onLoadMoreDay(dayKey);
  }, [dayKey, onLoadMoreDay]);

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

        <div className={styles.controlsRow}>
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

          <div className={styles.sortWrapper} ref={sortWrapperRef}>
            <button
              type="button"
              className={styles.sortTrigger}
              onClick={() => setSortPopupOpen((prev) => !prev)}
            >
              <FilterSortIcon width={24} height={24} />
            </button>
            {sortPopupOpen && (
              <div className={styles.sortPopup}>
                <button
                  type="button"
                  className={styles.sortPopupItem}
                  onClick={() => { onListSortChange('desc'); setSortPopupOpen(false); }}
                >
                  <span className={listSortOrder !== 'asc' ? `${styles.sortRadio} ${styles.sortRadioActive}` : styles.sortRadio}>
                    <span className={styles.sortRadioDot} />
                  </span>
                  <span className={styles.sortPopupItemText}>Сначала новые</span>
                </button>
                <button
                  type="button"
                  className={styles.sortPopupItem}
                  onClick={() => { onListSortChange('asc'); setSortPopupOpen(false); }}
                >
                  <span className={listSortOrder === 'asc' ? `${styles.sortRadio} ${styles.sortRadioActive}` : styles.sortRadio}>
                    <span className={styles.sortRadioDot} />
                  </span>
                  <span className={styles.sortPopupItemText}>Сначала старые</span>
                </button>
              </div>
            )}
          </div>
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
          {!dayLoadingMap[dayKey] && !!dayHasMoreMap[dayKey] && (
            <div className={styles.loadMoreWrap}>
              <Button
                text="Загрузить ещё"
                showArrow={false}
                active
                size="small"
                onClick={handleLoadMoreDay}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
