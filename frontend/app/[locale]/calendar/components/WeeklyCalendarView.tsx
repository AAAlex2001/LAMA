'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import WeeklyCard from './WeeklyCard';
import Loader from '@/components/loader';
import styles from './weekly-view.module.scss';

interface WeeklyCalendarViewProps {
  weekItems: Record<string, Draft[]>;
  selectedDate: Date;
  isLoading: boolean;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
}

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Вс',
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeToday(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  return check < today;
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

export default function WeeklyCalendarView({
  weekItems,
  selectedDate,
  isLoading,
  onEdit,
  onAddPost,
}: WeeklyCalendarViewProps) {
  const weekStart = getWeekStart(selectedDate);

  const weekDays = React.useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart.getTime()]);

  return (
    <div className={styles.weeklyView}>
      {weekDays.map((dayDate) => {
        const dateKey = formatDateKey(dayDate);
        const dayPosts = weekItems[dateKey] || [];
        const sorted = sortPostsByTime(dayPosts);
        const isSelected = isSameDay(dayDate, selectedDate);
        const isPast = isBeforeToday(dayDate);

        const headerClasses = [
          styles.dayHeader,
          isSelected ? styles.dayHeaderToday : '',
          isPast && !isSelected ? styles.dayHeaderPast : '',
        ]
          .filter(Boolean)
          .join(' ');

        const addBtnClasses = [
          styles.addBtn,
          isPast && !isSelected ? styles.addBtnPast : '',
        ]
          .filter(Boolean)
          .join(' ');

        const cardsClasses = [
          styles.cardsContainer,
          isPast && !isSelected ? styles.cardsContainerPast : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={dateKey} className={styles.dayColumn}>
            <div className={headerClasses}>
              <span className={styles.dayName}>
                {DAY_NAMES_SHORT[dayDate.getDay()]}
              </span>
              <span className={styles.dayNumber}>{dayDate.getDate()}</span>
            </div>

            <button
              type="button"
              className={addBtnClasses}
              onClick={() => onAddPost(dayDate)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.00065 3.33203V12.6654M3.33398 7.9987H12.6673" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className={cardsClasses}>
              {isLoading ? (
                <div className={styles.dayLoader}>
                  <Loader size={18} color="blue" />
                </div>
              ) : sorted.length === 0 ? (
                <div className={styles.emptyDay}>—</div>
              ) : (
                sorted.map((post) => (
                  <WeeklyCard
                    key={post.id}
                    post={post}
                    onEdit={() => onEdit(post)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
