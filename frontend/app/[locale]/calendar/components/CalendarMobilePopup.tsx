'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DatePicker from '@/components/date-picker/date-picker';
import { formatTime, getPreviewText } from '../utils/calendar-helpers';
import styles from '../calendar.module.scss';

interface CalendarMobilePopupProps {
  isOpen: boolean;
  selectedDate: Date;
  currentView: 'day' | 'week' | 'month' | 'list';
  isGridView: boolean;
  gridPostCounts: Record<string, number>;
  mobilePosts: Draft[];
  isTodaySelected: boolean;
  listTitle: string;
  mobileGridTitle: string;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onOpenPost: (post: Draft) => void;
}

export default function CalendarMobilePopup({
  isOpen,
  selectedDate,
  currentView,
  isGridView,
  gridPostCounts,
  mobilePosts,
  isTodaySelected,
  listTitle,
  mobileGridTitle,
  onClose,
  onDateChange,
  onMonthChange,
  onOpenPost,
}: CalendarMobilePopupProps) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.mobileCalendarPopup}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.mobileCalendarContent}>
        <DatePicker
          value={selectedDate}
          onChange={onDateChange}
          onMonthChange={onMonthChange}
          locale="ru"
          minDate={null}
          highlightWeek={currentView === 'week'}
          postCounts={isGridView ? gridPostCounts : undefined}
        />

        {(isGridView || currentView === 'list') && (
          mobilePosts.length === 0 ? (
            isTodaySelected ? (
              <div className={styles.mobileTodayEmptyState}>
                <div className={styles.mobileTodayEmptyInner}>
                  <p className={styles.mobileTodayEmptyText}>На сегодня ничего не запланировано</p>
                </div>
              </div>
            ) : (
              <div className={styles.mobileEmptyState}>
                <div className={styles.mobileDayTitle}>{currentView === 'list' ? listTitle : mobileGridTitle}</div>
                <div className={styles.mobileEmptyTextBlock}>
                  <p className={styles.mobileEmptyTitle}>Ничего не запланировано</p>
                  <p className={styles.mobileEmptySubtitle}>
                    Создайте публикацию — она появится в календаре и в списке этого дня
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className={styles.mobilePostsSection}>
              <div className={styles.mobileDayTitle}>{currentView === 'list' ? listTitle : mobileGridTitle}</div>
              <div className={styles.mobilePostsList}>
                <div className={styles.mobilePostsInner}>
                  {mobilePosts.map((post) => {
                    const time = formatTime(
                      post.status === 'scheduled'
                        ? ((post as any).scheduled_time || post.created_at)
                        : ((post as any).published_at || post.updated_at || post.created_at)
                    );
                    const preview = getPreviewText(post);
                    return (
                      <div
                        key={post.id}
                        className={styles.mobilePostRow}
                        onClick={() => onOpenPost(post)}
                      >
                        <span className={styles.mobilePostTime}>{time}</span>
                        <span className={styles.mobilePostPreview}>{preview || '(без текста)'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
