'use client';

import React from 'react';
import type { Draft } from '@/types/post';
import type { DayStatusCount } from '../store';
import CalendarList from '../views/list/CalendarList';
import CalendarSidebar from '../views/day/CalendarSidebar';
import WeeklyCalendarView from '../views/week/WeeklyCalendarView';
import MonthGridView from '../views/month/MonthGridView';
import WeeklySidebar from '../views/week/WeeklySidebar';
import MonthlySidebar from '../views/month/MonthlySidebar';
import ListCalendarView from '../views/list/ListCalendarView';
import DayCalendarView from '../views/day/DayCalendarView';
import MonthCalendarView from '../views/month/MonthCalendarView';
import styles from '../calendar.module.scss';

interface CalendarMainContentProps {
  weekItems: Record<string, Draft[]>;
  selectedDate: Date;
  sidebarDate: Date;
  isLoading: boolean;
  currentView: 'day' | 'week' | 'month' | 'list';
  sortedPosts: Draft[];
  isGridView: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  listSortOrder: 'asc' | 'desc' | null;
  listStatusFilter: string | null;
  gridPostCounts: Record<string, number>;
  gridAdsCounts?: Record<string, number>;
  statusCounts: Record<string, DayStatusCount>;
  dayLoadingMap: Record<string, boolean>;
  dayHasMoreMap: Record<string, boolean>;
  onEdit: (post: Draft) => void;
  onAddPost: (date: Date) => void;
  onLoadMoreDay: (dateKey: string) => void;
  onLoadMoreList: () => void;
  onListSortChange: (order: 'asc' | 'desc' | null) => void;
  onListStatusChange: (status: string | null) => void;
  onMonthChange: (date: Date) => void;
  onSidebarDateChange: (date: Date) => void;
  mobileActiveFilters: Record<string, string[]>;
  onMobileFilterChange: (key: string, values: string[]) => void;
  allChannels?: Array<{ id: number; title: string }>;
  allTags?: Array<{ id: number; name: string; color?: string }>;
}

export default function CalendarMainContent({
  weekItems,
  selectedDate,
  sidebarDate,
  isLoading,
  currentView,
  sortedPosts,
  isGridView,
  isLoadingMore,
  hasMore,
  listSortOrder,
  listStatusFilter,
  gridPostCounts,
  gridAdsCounts,
  statusCounts,
  dayLoadingMap,
  dayHasMoreMap,
  onEdit,
  onAddPost,
  onLoadMoreDay,
  onLoadMoreList,
  onListSortChange,
  onListStatusChange,
  onMonthChange,
  onSidebarDateChange,
  mobileActiveFilters,
  onMobileFilterChange,
  allChannels,
  allTags,
}: CalendarMainContentProps) {
  return (
    <div className={`${styles.mainContent} ${currentView === 'week' ? styles.mainContentWeek : ''} ${currentView === 'day' ? styles.mainContentDay : ''} ${currentView === 'list' ? styles.mainContentList : ''} ${currentView === 'month' ? styles.monthMode : ''}`}>
      {currentView === 'month' ? (
        <>
          <div className={styles.monthDesktopGrid}>
            <MonthGridView
              selectedDate={selectedDate}
              sidebarDate={sidebarDate}
              postCounts={gridPostCounts}
              adsCounts={gridAdsCounts}
              statusCounts={statusCounts}
              onDayClick={onSidebarDateChange}
            />
            <MonthlySidebar
              sidebarDate={sidebarDate}
              weekItems={weekItems}
              dayLoadingMap={dayLoadingMap}
              dayHasMoreMap={dayHasMoreMap}
              onLoadMoreDay={onLoadMoreDay}
              onEdit={onEdit}
            />
          </div>
          <MonthCalendarView
            selectedDate={selectedDate}
            sidebarDate={sidebarDate}
            onSidebarDateChange={onSidebarDateChange}
            weekItems={weekItems}
            gridPostCounts={gridPostCounts}
            gridAdsCounts={gridAdsCounts}
            onMonthChange={onMonthChange}
            onEdit={onEdit}
            onAddPost={onAddPost}
            isLoading={isLoading}
            onLoadMoreDay={onLoadMoreDay}
            dayLoadingMap={dayLoadingMap}
            dayHasMoreMap={dayHasMoreMap}
          />
        </>
      ) : isGridView ? (
        <>
          <WeeklyCalendarView
            weekItems={weekItems}
            selectedDate={selectedDate}
            sidebarDate={sidebarDate}
            isLoading={isLoading}
            onEdit={onEdit}
            onAddPost={onAddPost}
            onReachEnd={onLoadMoreDay}
            dayLoading={dayLoadingMap}
            dayHasMore={dayHasMoreMap}
            onDayClick={onSidebarDateChange}
          />
          <WeeklySidebar
            selectedDate={selectedDate}
            sidebarDate={sidebarDate}
            weekItems={weekItems}
            postCounts={gridPostCounts}
            adsCounts={gridAdsCounts}
            isLoading={isLoading}
            onMonthChange={onMonthChange}
            onSidebarDateChange={onSidebarDateChange}
            onEdit={onEdit}
            highlightWeek={true}
          />
        </>
      ) : currentView === 'list' ? (
        <div className={styles.postsColumn}>
          <ListCalendarView
            posts={sortedPosts}
            isLoading={isLoading}
            onEdit={onEdit}
            onLoadMore={onLoadMoreList}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            dateSortOrder={listSortOrder}
            statusFilter={listStatusFilter}
            onDateSortChange={onListSortChange}
            onStatusFilterChange={onListStatusChange}
            mobileActiveFilters={mobileActiveFilters}
            allChannels={allChannels}
            allTags={allTags}
          />
        </div>
      ) : currentView === 'day' ? (
        <>
          <div className={styles.postsColumn}>
            <DayCalendarView
              posts={sortedPosts}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={onLoadMoreList}
              onEdit={onEdit}
              onAddPost={onAddPost}
              selectedDate={selectedDate}
            />
          </div>

          <CalendarSidebar
            selectedDate={selectedDate}
            sidebarDate={sidebarDate}
            onSidebarDateChange={onSidebarDateChange}
            posts={sortedPosts}
            onEdit={onEdit}
            postCounts={gridPostCounts}
            adsCounts={gridAdsCounts}
            onMonthChange={onMonthChange}
          />
        </>
      ) : (
        <>
          <div className={styles.postsColumn}>
            <CalendarList
              posts={sortedPosts}
              isLoading={isLoading}
              showInlineLoader={isLoadingMore}
              onEdit={onEdit}
              onAddPost={() => onAddPost(selectedDate)}
            />
          </div>

          <CalendarSidebar
            selectedDate={selectedDate}
            sidebarDate={sidebarDate}
            onSidebarDateChange={onSidebarDateChange}
            posts={sortedPosts}
            onEdit={onEdit}
            postCounts={gridPostCounts}
            adsCounts={gridAdsCounts}
            onMonthChange={onMonthChange}
          />
        </>
      )}
    </div>
  );
}
