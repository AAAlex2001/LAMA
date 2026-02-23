'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import { CalendarSidebarPostIcon, CalendarSidebarSentIcon } from '@/components/icons';
import { useInView } from '../store/useInView';
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
}: MonthCalendarViewProps) {
  const dayKey = formatDateOnly(sidebarDate);
  const dayPosts = weekItems[dayKey] || [];
  const isDayLoading = !!dayLoadingMap[dayKey];
  const hasDayMore = !!dayHasMoreMap[dayKey];

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    skip: !hasDayMore || isDayLoading,
  });

  React.useEffect(() => {
    if (inView && hasDayMore && !isDayLoading) {
      onLoadMoreDay(dayKey);
    }
  }, [inView, hasDayMore, isDayLoading, onLoadMoreDay, dayKey]);

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

        <div className={styles.postList}>
          {dayPosts.length === 0 ? (
            <div className={styles.empty}>Нет публикаций</div>
          ) : (
            dayPosts.map((post) => {
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
          {hasDayMore && !isDayLoading && (
            <div ref={sentinelRef as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />
          )}
        </div>
      </div>
    </div>
  );
}
