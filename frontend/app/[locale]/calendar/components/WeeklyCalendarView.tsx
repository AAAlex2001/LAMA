'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarAddIcon } from '@/components/icons';
import Button from '@/components/button/button';
import WeeklyCard from './WeeklyCard';
import Loader from '@/components/loader';
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
  const cardsRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const dayScrollRestoreRef = React.useRef<Record<string, { top: number; pending: boolean; sawLoading: boolean }>>({});

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

  React.useEffect(() => {
    const restoreMap = dayScrollRestoreRef.current;
    Object.keys(restoreMap).forEach((dateKey) => {
      const restore = restoreMap[dateKey];
      if (!restore?.pending) return;
      const isDayLoading = !!dayLoading?.[dateKey];
      if (isDayLoading) {
        restore.sawLoading = true;
        return;
      }
      if (restore.sawLoading) {
        const el = cardsRefs.current[dateKey];
        if (el) {
          el.scrollTop = restore.top;
        }
        delete restoreMap[dateKey];
      }
    });
  }, [dayLoading]);

  const handleLoadMoreDay = React.useCallback((dateKey: string) => {
    if (!onReachEnd) return;
    const el = cardsRefs.current[dateKey];
    dayScrollRestoreRef.current[dateKey] = {
      top: el?.scrollTop ?? 0,
      pending: true,
      sawLoading: false,
    };
    onReachEnd(dateKey);
  }, [onReachEnd]);

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
              ref={(el) => {
                cardsRefs.current[dateKey] = el;
              }}
            >
              {sorted.length === 0 && !isLoading ? (
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
                  {(isLoading || dayLoading?.[dateKey]) && (
                    <div className={styles.dayLoader}>
                      <Loader size={16} color="blue" />
                    </div>
                  )}
                  {!isLoading && !dayLoading?.[dateKey] && !!dayHasMore?.[dateKey] && !!onReachEnd && (
                    <div className={styles.dayLoader}>
                      <Button
                        text="Загрузить ещё"
                        showArrow={false}
                        active
                        size="small"
                        onClick={() => handleLoadMoreDay(dateKey)}
                      />
                    </div>
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
