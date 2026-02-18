'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import CalendarList from './CalendarList';
import CalendarSidebar from './CalendarSidebar';
import WeeklyCalendarView from './WeeklyCalendarView';
import WeeklySidebar from './WeeklySidebar';
import ListCalendarView from './ListCalendarView';
import styles from '../calendar.module.scss';

interface CalendarMainContentProps {
  weekItems: Record<string, Draft[]>;
  selectedDate: Date;
  isLoading: boolean;
  currentView: 'day' | 'week' | 'month' | 'list';
  sortedPosts: Draft[];
  monthDates: Date[];
  isGridView: boolean;
  isLoadingMore: boolean;
  gridPostCounts: Record<string, number>;
  dayLoadingMap: Record<string, boolean>;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  onLoadMoreDay: (dateKey: string) => void;
  onMonthChange: (date: Date) => void;
  onDateChange: (date: Date) => void;
}

export default function CalendarMainContent({
  weekItems,
  selectedDate,
  isLoading,
  currentView,
  sortedPosts,
  monthDates,
  isGridView,
  isLoadingMore,
  gridPostCounts,
  dayLoadingMap,
  onEdit,
  onAddPost,
  onLoadMoreDay,
  onMonthChange,
  onDateChange,
}: CalendarMainContentProps) {
  return (
    <div className={`${styles.mainContent} ${isGridView ? styles.mainContentWeek : ''}`}>
      {isGridView ? (
        <>
          <WeeklyCalendarView
            weekItems={weekItems}
            selectedDate={selectedDate}
            isLoading={isLoading}
            onEdit={onEdit}
            onAddPost={onAddPost}
            visibleDates={currentView === 'month' ? monthDates : undefined}
            onReachEnd={onLoadMoreDay}
            dayLoading={dayLoadingMap}
          />
          <WeeklySidebar
            selectedDate={selectedDate}
            weekItems={weekItems}
            postCounts={gridPostCounts}
            onMonthChange={onMonthChange}
            onDateChange={onDateChange}
            onEdit={onEdit}
            highlightWeek={currentView === 'week'}
          />
        </>
      ) : currentView === 'list' ? (
        <div className={styles.postsColumn}>
          <ListCalendarView
            posts={sortedPosts}
            isLoading={isLoading}
            onEdit={onEdit}
            isLoadingMore={isLoadingMore}
          />
        </div>
      ) : (
        <>
          <div className={styles.postsColumn}>
            <CalendarList
              posts={sortedPosts}
              isLoading={isLoading}
              showInlineLoader={isLoadingMore}
              onEdit={onEdit}
            />
          </div>

          <CalendarSidebar
            selectedDate={selectedDate}
            onDateChange={onDateChange}
          />
        </>
      )}
    </div>
  );
}
