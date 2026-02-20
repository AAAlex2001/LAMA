'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import { CalendarAddIcon } from '@/components/icons';
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
  const sentinelRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const wasLoadingRef = React.useRef<Record<string, boolean>>({});
  const savedScrollRef = React.useRef<Record<string, number>>({});

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
    if (!dayLoading) return;
    Object.keys(wasLoadingRef.current).forEach((dateKey) => {
      if (wasLoadingRef.current[dateKey] && !dayLoading[dateKey]) {
        const container = cardsRefs.current[dateKey];
        if (container) {
          container.scrollTop = savedScrollRef.current[dateKey] ?? 0;
        }
      }
    });
    weekDays.forEach((d) => {
      const dk = formatDateOnly(d);
      wasLoadingRef.current[dk] = !!dayLoading[dk];
    });
  }, [dayLoading, weekDays]);

  React.useEffect(() => {
    if (!onReachEnd) return;

    const observers: IntersectionObserver[] = [];
    const exitTracker: Record<string, boolean> = {};

    Object.entries(sentinelRefs.current).forEach(([dateKey, sentinel]) => {
      if (!sentinel) return;
      const container = cardsRefs.current[dateKey];
      if (!container) return;

      exitTracker[dateKey] = false;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;

          if (!entry.isIntersecting) {
            exitTracker[dateKey] = true;
            return;
          }

          if (!exitTracker[dateKey]) return;
          if (dayLoading?.[dateKey]) return;
          if (!dayHasMore?.[dateKey]) return;

          savedScrollRef.current[dateKey] = container.scrollTop;
          onReachEnd(dateKey);
        },
        {
          root: container,
          rootMargin: '0px',
          threshold: 0,
        },
      );

      observer.observe(sentinel);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [onReachEnd, dayLoading, dayHasMore, weekDays]);

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
                  {!!dayHasMore?.[dateKey] && !dayLoading?.[dateKey] && (
                    <div
                      ref={(el) => {
                        sentinelRefs.current[dateKey] = el;
                      }}
                      className={styles.scrollSentinel}
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
