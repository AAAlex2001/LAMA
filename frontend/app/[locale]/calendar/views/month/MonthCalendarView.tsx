'use client';

import React from 'react';
import type { Draft } from '@/types/post';
import DatePicker from '@/components/date-picker/date-picker';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import { CalendarDocPostIcon, CalendarDraftIcon, CalendarRepeatIcon, CalendarBotMessageIcon } from '@/components/icons';
import { useInView } from '../../hooks/useInView';
import {
  formatTime,
  getSourceDate,
  getPreviewText,
  formatDateOnly,
  hasRepeat,
  isBeforeToday,
} from '../../utils/calendar-helpers';
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
  const isPast = isBeforeToday(sidebarDate);

  const [postListEl, setPostListEl] = React.useState<HTMLDivElement | null>(null);

  const loadingRef = React.useRef(isDayLoading);
  loadingRef.current = isDayLoading;
  const hasMoreRef = React.useRef(hasDayMore);
  hasMoreRef.current = hasDayMore;
  const onLoadRef = React.useRef(onLoadMoreDay);
  onLoadRef.current = onLoadMoreDay;
  const dayKeyRef = React.useRef(dayKey);
  dayKeyRef.current = dayKey;

  const { ref: sentinelRef } = useInView({
    root: postListEl,
    rootMargin: '0px 0px 400px 0px',
    threshold: 0,
    skip: !hasDayMore || isDayLoading || !postListEl,
    onChange(inView) {
      if (inView && hasMoreRef.current && !loadingRef.current) {
        onLoadRef.current(dayKeyRef.current);
      }
    },
  });

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
        {!isPast && (
          <div className={styles.createWrap}>
            <Button
              text="Создать публикацию"
              showArrow={false}
              active
              className={styles.createBtn}
              onClick={() => onAddPost(sidebarDate)}
            />
          </div>
        )}

        <div className={styles.postList} ref={setPostListEl}>
          {(isLoading || isDayLoading) && dayPosts.length === 0 ? (
            <div className={styles.loadMoreWrap}>
              <Loader size={20} color="blue" />
            </div>
          ) : dayPosts.length === 0 ? (
            <div className={styles.empty}>Нет публикаций</div>
          ) : (
            dayPosts.map((post) => {
              const sourceDate = getSourceDate(post);
              const time = formatTime(sourceDate);
              const preview = getPreviewText(post);
              const isSeries = (post.series_count ?? 0) > 1;
              return (
                <div
                  key={post.id}
                  className={styles.postRow}
                  onClick={() => onEdit(post)}
                >
                  {post.is_bot_message ? (
                    <CalendarBotMessageIcon width={14} height={14} />
                  ) : post.status === 'draft' ? (
                    <CalendarDraftIcon width={14} height={14} />
                  ) : (
                    <CalendarDocPostIcon width={16} height={16} />
                  )}
                  <span className={styles.postTime}>{time}</span>
                  <span className={styles.postPreview}>{preview || '(без текста)'}</span>
                  {hasRepeat(post) && <CalendarRepeatIcon width={14} height={14} />}
                  {isSeries && <span className={styles.seriesBadge}>Серия · {post.series_count}</span>}
                </div>
              );
            })
          )}
          {dayLoadingMap[dayKey] && dayPosts.length > 0 && (
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
