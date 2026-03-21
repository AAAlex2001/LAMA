'use client';

import React from 'react';
import type { Draft } from '@/types/post';
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

function DayColumn({
  dayDate,
  dateKey,
  posts,
  isLoading,
  onEdit,
  onAddPost,
  isSelected,
  isPast,
  dayLoading,
  dayHasMore,
  onReachEnd,
  onDayClick,
}: {
  dayDate: Date;
  dateKey: string;
  posts: Draft[];
  isLoading: boolean;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  isSelected: boolean;
  isPast: boolean;
  dayLoading: boolean;
  dayHasMore: boolean;
  onReachEnd?: (dateKey: string) => void;
  onDayClick?: (date: Date) => void;
}) {
  const scrollRootRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollRootEl, setScrollRootEl] = React.useState<HTMLDivElement | null>(
    null,
  );
  const loadingRef = React.useRef(dayLoading);
  loadingRef.current = dayLoading;
  const hasMoreRef = React.useRef(dayHasMore);
  hasMoreRef.current = dayHasMore;
  const onReachEndRef = React.useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;
  const dateKeyRef = React.useRef(dateKey);
  dateKeyRef.current = dateKey;

  const { ref: sentinelRef } = useInView({
    root: scrollRootEl,
    rootMargin: '0px 0px 400px 0px',
    threshold: 0,
    skip: !dayHasMore || dayLoading,
    onChange(inView) {
      if (inView && hasMoreRef.current && !loadingRef.current) {
        onReachEndRef.current?.(dateKeyRef.current);
      }
    },
  });

  const dayPosts = posts;

  const setScrollRoot = React.useCallback((el: HTMLDivElement | null) => {
    scrollRootRef.current = el;
    setScrollRootEl(el);
  }, []);

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
    <div className={styles.dayColumn}>
      <div className={headerClasses} onClick={() => onDayClick?.(dayDate)} style={{ cursor: onDayClick ? 'pointer' : undefined }}>
        <span className={styles.dayName}>
          {DAY_NAMES_SHORT[dayDate.getDay()]}
        </span>
        <span className={styles.dayNumber}>{dayDate.getDate()}</span>
      </div>

      {!isPast && (
        <button
          type="button"
          className={addBtnClasses}
          onClick={() => onAddPost(dayDate)}
        >
          <CalendarAddIcon />
        </button>
      )}

      <div
        className={cardsClasses}
        data-date-key={dateKey}
        ref={setScrollRoot}
      >
        {isLoading ? (
          <div className={styles.dayLoader}>
            <Loader size={16} color="blue" />
          </div>
        ) : dayPosts.length === 0 ? (
          <div className={styles.emptyDay}>—</div>
        ) : (
          <>
            {dayPosts.map((post) => (
              <WeeklyCard
                key={post.id}
                post={post}
                onEdit={() => onEdit(post)}
              />
            ))}
            {dayLoading && (
              <div className={styles.dayLoader}>
                <Loader size={16} color="blue" />
              </div>
            )}
          </>
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  );
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
        const selectedTarget = sidebarDate ?? selectedDate;
        const isSelected = isSameDay(dayDate, selectedTarget);
        const isPast = isBeforeToday(dayDate);

        return (
          <DayColumn
            key={dateKey}
            dayDate={dayDate}
            dateKey={dateKey}
            posts={dayPosts}
            isLoading={isLoading}
            onEdit={onEdit}
            onAddPost={onAddPost}
            isSelected={isSelected}
            isPast={isPast}
            dayLoading={!!dayLoading?.[dateKey]}
            dayHasMore={!!dayHasMore?.[dateKey]}
            onReachEnd={onReachEnd}
            onDayClick={onDayClick}
          />
        );
      })}
    </div>
  );
}
