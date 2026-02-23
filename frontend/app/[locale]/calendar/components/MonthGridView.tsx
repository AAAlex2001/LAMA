'use client';

import React from 'react';
import {
  InboxIcon,
} from '@/components/icons';
import {
  formatDateOnly,
  isSameDay,
  isBeforeToday,
} from '../utils/calendar-helpers';
import styles from './month-grid-view.module.scss';

interface MonthGridViewProps {
  selectedDate: Date;
  sidebarDate: Date;
  postCounts: Record<string, number>;
  onDayClick: (date: Date) => void;
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

export default function MonthGridView({
  selectedDate,
  sidebarDate,
  postCounts,
  onDayClick,
}: MonthGridViewProps) {
  const gridDates = getMonthGridDates(selectedDate);
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
              const total = postCounts[dateKey] || 0;

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

                  {total > 0 && (
                    <div className={styles.statsBlock}>
                      <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                          <InboxIcon width={12} height={12} color="#3B82F6" />
                          <span className={styles.statValueBlue}>{total}</span>
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
