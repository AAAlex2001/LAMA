'use client';

import React from 'react';
import DatePicker from '@/components/date-picker/date-picker';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import Loader from '@/components/loader';
import {
  formatDayTitle,
  formatTime,
  getPreviewText,
  getSourceDate,
  sortPostsByTime,
  isSameDay,
  formatDateOnly,
} from '../utils/calendar-helpers';
import styles from './weekly-sidebar.module.scss';

interface WeeklySidebarProps {
  selectedDate: Date;
  sidebarDate: Date;
  weekItems: Record<string, Draft[]>;
  postCounts: Record<string, number>;
  onMonthChange?: (date: Date) => void;
  onSidebarDateChange: (date: Date) => void;
  onEdit: (post: Draft) => void;
  highlightWeek?: boolean;
  onLoadMoreDay?: (dateKey: string) => void;
  dayLoading?: Record<string, boolean>;
}

export default function WeeklySidebar({
  selectedDate,
  sidebarDate,
  weekItems,
  postCounts,
  onMonthChange,
  onSidebarDateChange,
  onEdit,
  highlightWeek = true,
  onLoadMoreDay,
  dayLoading,
}: WeeklySidebarProps) {
  const postsListRef = React.useRef<HTMLDivElement>(null);
  const wasNearBottomRef = React.useRef(false);

  const dateKey = formatDateOnly(sidebarDate);
  const dayPosts = weekItems[dateKey] || [];
  const sortedPosts = sortPostsByTime(dayPosts);
  const dayTitle = formatDayTitle(sidebarDate);
  const hasPosts = sortedPosts.length > 0;
  const today = new Date();
  const isTodaySelected = isSameDay(sidebarDate, today);
  const isLoadingDay = dayLoading?.[dateKey] ?? false;

  const handlePostsScroll = React.useCallback(() => {
    const el = postsListRef.current;
    if (!el || !onLoadMoreDay) return;
    const nearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 12;
    if (nearBottom && !wasNearBottomRef.current && !isLoadingDay) {
      wasNearBottomRef.current = true;
      onLoadMoreDay(dateKey);
    }
    if (!nearBottom) wasNearBottomRef.current = false;
  }, [dateKey, onLoadMoreDay, isLoadingDay]);

  const sidebarClasses = [
    styles.sidebar,
    !hasPosts && !isTodaySelected ? styles.sidebarEmpty : '',
    !hasPosts && isTodaySelected ? styles.sidebarTodayEmpty : '',
  ]
    .filter(Boolean)
    .join(' ');

  const calendarWrapperClasses = [
    styles.calendarWrapper,
    !hasPosts ? styles.calendarWrapperEmpty : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={sidebarClasses}>
      <div className={calendarWrapperClasses}>
        <DatePicker
          value={sidebarDate}
          onChange={onSidebarDateChange}
          onMonthChange={onMonthChange}
          locale="ru"
          minDate={null}
          className={styles.calendar}
          highlightWeek={highlightWeek}
          postCounts={postCounts}
        />
      </div>

      {!hasPosts ? (
        isTodaySelected ? (
          <div className={styles.todayEmptyState}>
            <div className={styles.todayEmptyInner}>
              <p className={styles.todayEmptyText}>На сегодня ничего не запланировано</p>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.dayTitle}>{dayTitle}</div>
            <div className={styles.emptyTextBlock}>
              <p className={styles.emptyTitle}>Ничего не запланировано</p>
              <p className={styles.emptySubtitle}>
                Создайте публикацию — она появится в календаре и в списке этого дня
              </p>
            </div>
          </div>
        )
      ) : (
        <div className={styles.postsSection}>
          <div className={styles.dayTitle}>{dayTitle}</div>
          <div className={styles.postsList} ref={postsListRef} onScroll={handlePostsScroll}>
            <div className={styles.postsInner}>
              {sortedPosts.map((post) => {
                const time = formatTime(getSourceDate(post));
                const preview = getPreviewText(post);
                const isPublished = post.status === 'published';

                return (
                  <div
                    key={post.id}
                    className={styles.postRow}
                    onClick={() => onEdit(post)}
                  >
                    <div className={styles.postIcon}>
                      {isPublished ? <CalendarSidebarSentIcon /> : <CalendarSidebarPostIcon />}
                    </div>
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
                  </div>
                );
              })}
              {isLoadingDay && (
                <div className={styles.dayLoader}>
                  <Loader size={16} color="blue" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
