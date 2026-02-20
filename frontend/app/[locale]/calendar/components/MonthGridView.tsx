'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import {
  InboxIcon,
  CalendarCheckIcon,
  ParserIcon,
  WalletIcon,
  CalendarReactionsIcon,
  CalendarViewsIcon,
} from '@/components/icons';
import {
  formatDateOnly,
  isSameDay,
  isBeforeToday,
  formatCompact,
} from '../utils/calendar-helpers';
import styles from './month-grid-view.module.scss';

interface MonthGridViewProps {
  selectedDate: Date;
  sidebarDate: Date;
  weekItems: Record<string, Draft[]>;
  onDayClick: (date: Date) => void;
  onEdit: (post: Draft) => void;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getMonthGridDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const dates: Date[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    dates.push(d);
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(new Date(year, month, i));
  }

  const totalRows = dates.length > 35 ? 6 : 5;
  const totalCells = totalRows * 7;
  while (dates.length < totalCells) {
    const nextDay = dates.length - startDow - lastDay.getDate() + 1;
    dates.push(new Date(year, month + 1, nextDay));
  }

  return dates;
}

interface DayStats {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
  totalReactions: number;
  totalViews: number;
}

function computeDayStats(posts: Draft[]): DayStats {
  let published = 0;
  let scheduled = 0;
  let draft = 0;
  let totalReactions = 0;
  let totalViews = 0;

  for (const p of posts) {
    if (p.status === 'published') published++;
    else if (p.status === 'scheduled') scheduled++;
    else draft++;
    if (typeof p.reactions_count === 'number') totalReactions += p.reactions_count;
    if (typeof p.views_count === 'number') totalViews += p.views_count;
  }

  return { total: posts.length, published, scheduled, draft, totalReactions, totalViews };
}

export default function MonthGridView({
  selectedDate,
  sidebarDate,
  weekItems,
  onDayClick,
}: MonthGridViewProps) {
  const gridDates = React.useMemo(() => getMonthGridDates(selectedDate), [selectedDate]);
  const currentMonth = selectedDate.getMonth();
  const today = new Date();

  const rows: Date[][] = [];
  for (let i = 0; i < gridDates.length; i += 7) {
    rows.push(gridDates.slice(i, i + 7));
  }

  return (
    <div className={styles.monthGrid}>
      {/* Weekday header */}
      <div className={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekdayCell}>
            <span className={styles.weekdayLabel}>{label}</span>
          </div>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className={styles.daysRow}>
            {row.map((dayDate) => {
              const dateKey = formatDateOnly(dayDate);
              const isCurrentMonth = dayDate.getMonth() === currentMonth;
              const isPast = isBeforeToday(dayDate);
              const isToday = isSameDay(dayDate, today);
              const isSelected = isSameDay(dayDate, sidebarDate);
              const dayPosts = weekItems[dateKey] || [];
              const stats = dayPosts.length > 0 ? computeDayStats(dayPosts) : null;

              const cellClasses = [
                styles.dayCell,
                !isCurrentMonth ? styles.dayCellOther : '',
                isPast && !isToday ? styles.dayCellPast : '',
                isToday ? styles.dayCellToday : '',
                isSelected ? styles.dayCellSelected : '',
              ].filter(Boolean).join(' ');

              return (
                <div
                  key={dateKey}
                  className={cellClasses}
                  onClick={() => onDayClick(dayDate)}
                >
                  <span className={`${styles.dayNumber} ${isPast && !isToday ? styles.dayNumberPast : ''}`}>
                    {dayDate.getDate()}
                  </span>

                  {stats && stats.total > 0 && (
                    <div className={styles.statsBlock}>
                      <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                          <InboxIcon width={12} height={12} color="#3B82F6" />
                          <span className={styles.statValueBlue}>{stats.total}</span>
                        </div>
                        <div className={styles.statItemRight}>
                          <span className={styles.statValueGreen}>{stats.published}</span>
                          <CalendarCheckIcon width={10} height={10} color="#34C759" />
                        </div>
                      </div>

                      <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                          <ParserIcon width={12} height={12} color="#CED2D6" />
                          <span className={styles.statValueGray}>{stats.scheduled}</span>
                        </div>
                        {stats.draft > 0 && (
                          <div className={styles.statItemRight}>
                            <span className={styles.statValueOrange}>{stats.draft}</span>
                            <WalletIcon width={12} height={12} color="#FF8D28" />
                          </div>
                        )}
                      </div>

                      <div className={styles.statsRowBottom}>
                        <div className={styles.statItem}>
                          <CalendarReactionsIcon width={12} height={12} color="#B0B4B8" />
                          <span className={styles.statValueMuted}>{formatCompact(stats.totalReactions)}</span>
                        </div>
                        <div className={styles.statItem}>
                          <CalendarViewsIcon width={12} height={12} color="#B0B4B8" />
                          <span className={styles.statValueMuted}>{formatCompact(stats.totalViews)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
