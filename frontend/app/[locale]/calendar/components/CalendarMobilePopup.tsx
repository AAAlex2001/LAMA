'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import DatePicker from '@/components/date-picker/date-picker';
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
          postCounts={gridPostCounts}
          className={styles.mobilePopupDatePicker}
        />


      </div>
    </div>
  );
}
