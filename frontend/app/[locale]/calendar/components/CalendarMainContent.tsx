'use client';

import React from 'react';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import CalendarList from './CalendarList';
import CalendarSidebar from './CalendarSidebar';
import WeeklyCalendarView from './WeeklyCalendarView';
import WeeklySidebar from './WeeklySidebar';
import MonthlySidebar from './MonthlySidebar';
import ListCalendarView from './ListCalendarView';
import styles from '../calendar.module.scss';

interface CalendarMainContentProps {
  weekItems: Record<string, Draft[]>;
  selectedDate: Date;
  sidebarDate: Date;
  isLoading: boolean;
  currentView: 'day' | 'week' | 'month' | 'list';
  sortedPosts: Draft[];
  monthDates: Date[];
  isGridView: boolean;
  isLoadingMore: boolean;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
  mobileListSortOpen: boolean;
  onMobileListSortOpenChange: (open: boolean) => void;
  mobileListSortAnchor: { bottom: number; right: number } | null;
  gridPostCounts: Record<string, number>;
  dayLoadingMap: Record<string, boolean>;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  onLoadMoreDay: (dateKey: string) => void;
  onListSortChange: (order: 'asc' | 'desc' | null) => void;
  onListStatusChange: (status: string | null) => void;
  onMonthChange: (date: Date) => void;
  onSidebarDateChange: (date: Date) => void;
}

export default function CalendarMainContent({
  weekItems,
  selectedDate,
  sidebarDate,
  isLoading,
  currentView,
  sortedPosts,
  monthDates,
  isGridView,
  isLoadingMore,
  listSortOrder,
  listStatusFilter,
  mobileListSortOpen,
  onMobileListSortOpenChange,
  mobileListSortAnchor,
  gridPostCounts,
  dayLoadingMap,
  onEdit,
  onAddPost,
  onLoadMoreDay,
  onListSortChange,
  onListStatusChange,
  onMonthChange,
  onSidebarDateChange,
}: CalendarMainContentProps) {
  return (
    <div className={`${styles.mainContent} ${isGridView ? styles.mainContentWeek : ''}`}>
      {isGridView ? (
        <>
          <WeeklyCalendarView
            weekItems={weekItems}
            selectedDate={selectedDate}
            sidebarDate={sidebarDate}
            isLoading={isLoading}
            onEdit={onEdit}
            onAddPost={onAddPost}
            visibleDates={currentView === 'month' ? monthDates : undefined}
            onReachEnd={onLoadMoreDay}
            dayLoading={dayLoadingMap}
            onDayClick={onSidebarDateChange}
          />
          {currentView === 'month' ? (
            <MonthlySidebar
              sidebarDate={sidebarDate}
              weekItems={weekItems}
              onEdit={onEdit}
              onLoadMoreDay={onLoadMoreDay}
              dayLoading={dayLoadingMap}
            />
          ) : (
            <WeeklySidebar
              selectedDate={selectedDate}
              sidebarDate={sidebarDate}
              weekItems={weekItems}
              postCounts={gridPostCounts}
              onMonthChange={onMonthChange}
              onSidebarDateChange={onSidebarDateChange}
              onEdit={onEdit}
              highlightWeek={true}
              onLoadMoreDay={onLoadMoreDay}
              dayLoading={dayLoadingMap}
            />
          )}
        </>
      ) : currentView === 'list' ? (
        <div className={styles.postsColumn}>
          <ListCalendarView
            posts={sortedPosts}
            isLoading={isLoading}
            onEdit={onEdit}
            isLoadingMore={isLoadingMore}
            dateSortOrder={listSortOrder}
            statusFilter={listStatusFilter}
            onDateSortChange={onListSortChange}
            onStatusFilterChange={onListStatusChange}
            mobileFilterOpen={mobileListSortOpen}
            onMobileFilterOpenChange={onMobileListSortOpenChange}
            mobileFilterAnchor={mobileListSortAnchor}
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
            sidebarDate={sidebarDate}
            onSidebarDateChange={onSidebarDateChange}
            posts={sortedPosts}
            onEdit={onEdit}
          />
        </>
      )}
    </div>
  );
}
