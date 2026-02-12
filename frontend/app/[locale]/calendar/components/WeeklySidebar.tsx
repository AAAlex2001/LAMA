'use client';

import React from 'react';
import DatePicker from '@/components/date-picker/date-picker';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import styles from './weekly-sidebar.module.scss';

interface WeeklySidebarProps {
  selectedDate: Date;
  weekItems: Record<string, Draft[]>;
  postCounts: Record<string, number>;
  onMonthChange?: (date: Date) => void;
  onDateChange: (date: Date) => void;
  onEdit: (post: Draft) => void;
}

const DAY_NAMES_FULL: Record<number, string> = {
  0: 'воскресенье',
  1: 'понедельник',
  2: 'вторник',
  3: 'среда',
  4: 'четверг',
  5: 'пятница',
  6: 'суббота',
};

const MONTH_NAMES_GEN: string[] = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDayTitle(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_GEN[date.getMonth()];
  const weekDay = DAY_NAMES_FULL[date.getDay()];
  return `${day} ${month}, ${weekDay}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getPreviewText(post: Draft): string {
  const html =
    post.formatted_content?.html ||
    post.formatted_content?.text ||
    post.text_content ||
    '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sortPostsByTime(posts: Draft[]): Draft[] {
  return [...posts].sort((a, b) => {
    const aTime = new Date(
      (a as any).scheduled_time || a.updated_at || a.created_at
    ).getTime();
    const bTime = new Date(
      (b as any).scheduled_time || b.updated_at || b.created_at
    ).getTime();
    return aTime - bTime;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function PostIconSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.33 2H11.67C12.4 2 13 2.6 13 3.33V14L8 11.5L3 14V3.33C3 2.6 3.6 2 4.33 2Z"
        fill="#3B82F6"
      />
    </svg>
  );
}

function SentIconSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9"
        stroke="#34C759"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WeeklySidebar({
  selectedDate,
  weekItems,
  postCounts,
  onMonthChange,
  onDateChange,
  onEdit,
}: WeeklySidebarProps) {
  const dateKey = formatDateKey(selectedDate);
  const dayPosts = weekItems[dateKey] || [];
  const sortedPosts = sortPostsByTime(dayPosts);
  const dayTitle = formatDayTitle(selectedDate);
  const hasPosts = sortedPosts.length > 0;
  const today = new Date();
  const isTodaySelected = isSameDay(selectedDate, today);

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
          value={selectedDate}
          onChange={onDateChange}
          onMonthChange={onMonthChange}
          locale="ru"
          minDate={null}
          className={styles.calendar}
          highlightWeek
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
          <div className={styles.postsList}>
            <div className={styles.postsInner}>
              {sortedPosts.map((post) => {
                const time = formatTime(
                  post.status === 'scheduled'
                    ? ((post as any).scheduled_time || post.created_at)
                    : ((post as any).published_at || post.updated_at || post.created_at)
                );
                const preview = getPreviewText(post);
                const isPublished = post.status === 'published';

                return (
                  <div
                    key={post.id}
                    className={styles.postRow}
                    onClick={() => onEdit(post)}
                  >
                    <div className={styles.postIcon}>
                      {isPublished ? <SentIconSVG /> : <PostIconSVG />}
                    </div>
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
