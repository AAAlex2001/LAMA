'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarAddIcon } from '@/components/icons';
import WeeklyCard from './WeeklyCard';
import Loader from '@/components/loader';
import { useInView } from '../store/useInView';
import {
  DAY_NAMES_SHORT,
  getWeekStart,
  formatDateOnly,
  isSameDay,
  isBeforeToday,
  sortPostsByTime,
} from '../utils/calendar-helpers';
import styles from './weekly-view.module.scss';

interface WeeklyCalendarViewProps {
  weekItems: Record<string, Draft[]>;
  selectedDate: Date;
  sidebarDate?: Date;
  isLoading: boolean;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  visibleDates?: Date[];
  onReachEnd?: (dateKey: string) => void;
  dayLoading?: Record<string, boolean>;
  dayHasMore?: Record<string, boolean>;
  onDayClick?: (date: Date) => void;
}

function DaySentinel({
  dateKey,
  isLoading,
  onReachEnd,
}: {
  dateKey: string;
  isLoading: boolean;
  onReachEnd: (dateKey: string) => void;
}) {
  const { ref, inView } = useInView({ threshold: 0, skip: isLoading });

  React.useEffect(() => {
    if (inView && !isLoading) {
      onReachEnd(dateKey);
    }
  }, [inView, isLoading, onReachEnd, dateKey]);

  return <div ref={ref as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />;
}

export default function WeeklyCalendarView({
  weekItems,
  selectedDate,
  sidebarDate,
  isLoading,
  onEdit,
  onAddPost,
  visibleDates,
  onReachEnd,
  dayLoading,
  dayHasMore,
  onDayClick,
}: WeeklyCalendarViewProps) {
  const weekStart = getWeekStart(selectedDate);

  const weekDays = (() => {
    if (visibleDates?.length) {
      return visibleDates;
    }
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  })();

  return (
    <div className={styles.weeklyView}>
      {weekDays.map((dayDate) => {
        const dateKey = formatDateOnly(dayDate);
        const dayPosts = weekItems[dateKey] || [];
        const sorted = sortPostsByTime(dayPosts);
        const selectedTarget = sidebarDate ?? selectedDate;
        const isSelected = isSameDay(dayDate, selectedTarget);
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
            <div className={headerClasses} onClick={() => onDayClick?.(dayDate)} style={{ cursor: onDayClick ? 'pointer' : undefined }}>
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
              <CalendarAddIcon />
            </button>

            <div
              className={cardsClasses}
              data-date-key={dateKey}
            >
              {isLoading ? (
                <div className={styles.dayLoader}>
                  <Loader size={16} color="blue" />
                </div>
              ) : sorted.length === 0 ? (
                <div className={styles.emptyDay}>—</div>
              ) : (
                <>
                  {sorted.map((post) => (
                    <WeeklyCard
                      key={post.id}
                      post={post}
                      onEdit={() => onEdit(post)}
                    />
                  ))}
                  {dayLoading?.[dateKey] && (
                    <div className={styles.dayLoader}>
                      <Loader size={16} color="blue" />
                    </div>
                  )}
                  {!!dayHasMore?.[dateKey] && !dayLoading?.[dateKey] && onReachEnd && (
                    <DaySentinel
                      dateKey={dateKey}
                      isLoading={!!dayLoading?.[dateKey]}
                      onReachEnd={onReachEnd}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
