'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PostPreviewModal from '@/components/post-preview-modal';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import CalendarHeader from './CalendarHeader';
import CalendarMainContent from './CalendarMainContent';
import CalendarMobilePopup from './CalendarMobilePopup';
import {
  useAppDispatch,
  useAppSelector,
  setSelectedDate,
  setCurrentView,
  setListDateRange,
  clearListDateRange,
  setListSortOrder,
  setListStatusFilter,
  setCountsMonthAnchor,
  selectSortedPosts,
  selectMobilePosts,
  selectGridPostCounts,
  selectDayLoadingMap,
  selectDayHasMoreMap,
  selectSelectedDateObj,
  selectSidebarDateObj,
  selectListRangeStartObj,
  selectListRangeEndObj,
  selectIsGridView,
  selectMobileFilterConfigs,
} from '../store';
import { fetchCalendarData, fetchMoreListPosts, fetchDayCounts, fetchMoreDayPosts } from '../store/thunks';
import { navigateStep, sidebarDateChange } from '../store/thunks/navigation';
import { getPreviewData } from '../utils/previewData';
import {
  buildCreatePostUrl,
  formatDateOnly,
  formatDayTitle,
  getMonthDates,
  getMonthLabel,
  isSameDay,
} from '../utils/calendar-helpers';
import styles from '../calendar.module.scss';

export default function CalendarPageConnected() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const calendar = useAppSelector((state) => state.calendar);
  const selectedDate = useAppSelector(selectSelectedDateObj);
  const sidebarDate = useAppSelector(selectSidebarDateObj);
  const listRangeStart = useAppSelector(selectListRangeStartObj);
  const listRangeEnd = useAppSelector(selectListRangeEndObj);

  const sortedPosts = useAppSelector(selectSortedPosts);
  const mobilePosts = useAppSelector(selectMobilePosts);
  const gridPostCounts = useAppSelector(selectGridPostCounts);
  const dayLoadingMap = useAppSelector(selectDayLoadingMap);
  const dayHasMoreMap = useAppSelector(selectDayHasMoreMap);
  const isGridView = useAppSelector(selectIsGridView);
  const mobileFilterConfigs = useAppSelector(selectMobileFilterConfigs);

  const [showMobile, setShowMobile] = React.useState(false);
  const [previewPost, setPreviewPost] = React.useState<Draft | null>(null);
  const [mobileActiveFilters, setMobileActiveFilters] = React.useState<Record<string, string[]>>({});

  const mainRef = React.useRef<HTMLElement | null>(null);
  const listScrollRestoreRef = React.useRef<{ pending: boolean; sawLoading: boolean; top: number }>({
    pending: false,
    sawLoading: false,
    top: 0,
  });

  React.useEffect(() => {
    setMobileActiveFilters({});
  }, [calendar.currentView]);

  React.useEffect(() => {
    const main = mainRef.current || (mainRef.current = document.querySelector('main'));
    if (main) main.scrollTop = 0;
    dispatch(fetchCalendarData());
  }, [
    calendar.currentView,
    calendar.selectedDate,
    calendar.listRangeStart,
    calendar.listRangeEnd,
    calendar.listSortOrder,
    calendar.listStatusFilter,
    dispatch,
  ]);

  React.useEffect(() => {
    dispatch(fetchDayCounts());
  }, [calendar.countsMonthAnchor, dispatch]);

  React.useEffect(() => {
    const restore = listScrollRestoreRef.current;
    if (!restore.pending) return;
    if (calendar.isLoadingMore) {
      restore.sawLoading = true;
      return;
    }
    if (restore.sawLoading) {
      const main = mainRef.current || (mainRef.current = document.querySelector('main'));
      if (main) {
        main.scrollTop = restore.top;
      }
      restore.pending = false;
      restore.sawLoading = false;
    }
  }, [calendar.isLoadingMore]);

  const handleLoadMoreList = React.useCallback(() => {
    const main = mainRef.current || (mainRef.current = document.querySelector('main'));
    listScrollRestoreRef.current.pending = true;
    listScrollRestoreRef.current.sawLoading = false;
    listScrollRestoreRef.current.top = main?.scrollTop ?? 0;
    dispatch(fetchMoreListPosts());
  }, [dispatch]);

  function handleMobileFilterChange(key: string, values: string[]) {
    if (key === 'date') {
      dispatch(setListSortOrder(values[0] === 'new' ? 'desc' : values[0] === 'old' ? 'asc' : null));
    }
    if (key === 'status') {
      dispatch(setListStatusFilter(values[0] || null));
    }
    setMobileActiveFilters((prev) => ({ ...prev, [key]: values }));
  }

  const previewData = previewPost ? getPreviewData(previewPost) : null;

  return (
    <div className={`${styles.page} ${calendar.currentView === 'week' ? styles.pageWeek : ''}`}>
      <div className={styles.container}>
        <CalendarHeader
          selectedDate={selectedDate}
          currentView={calendar.currentView}
          listRange={listRangeStart && listRangeEnd ? { start: listRangeStart, end: listRangeEnd } : null}
          onListRangeChange={(range) => {
            if (!range) {
              dispatch(clearListDateRange());
              return;
            }
            dispatch(setListDateRange({ start: formatDateOnly(range.start), end: formatDateOnly(range.end) }));
          }}
          onPrevDay={() => dispatch(navigateStep('prev'))}
          onNextDay={() => dispatch(navigateStep('next'))}
          onViewChange={(view) => dispatch(setCurrentView(view))}
          onOpenCalendarPopup={() => setShowMobile(true)}
          gridPostCounts={gridPostCounts}
          onMonthChange={(date) => dispatch(setCountsMonthAnchor(formatDateOnly(date)))}
          listSortOrder={calendar.listSortOrder}
          onListSortChange={(order) => dispatch(setListSortOrder(order))}
          mobileFilterConfigs={mobileFilterConfigs}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
        />

        <CalendarMainContent
          weekItems={calendar.weekItems}
          selectedDate={selectedDate}
          sidebarDate={sidebarDate}
          isLoading={calendar.isLoading}
          currentView={calendar.currentView}
          sortedPosts={sortedPosts}
          monthDates={getMonthDates(selectedDate)}
          isGridView={isGridView}
          isLoadingMore={calendar.isLoadingMore}
          hasMore={calendar.hasMore}
          listSortOrder={calendar.listSortOrder}
          listStatusFilter={calendar.listStatusFilter}
          gridPostCounts={gridPostCounts}
          dayLoadingMap={dayLoadingMap}
          dayHasMoreMap={dayHasMoreMap}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
          onEdit={(post) => setPreviewPost(post)}
          onAddPost={(date) => router.push(buildCreatePostUrl(date))}
          onLoadMoreDay={(dateKey) => dispatch(fetchMoreDayPosts(dateKey))}
          onLoadMoreList={handleLoadMoreList}
          onListSortChange={(order) => dispatch(setListSortOrder(order))}
          onListStatusChange={(status) => dispatch(setListStatusFilter(status))}
          onMonthChange={(date) => dispatch(setCountsMonthAnchor(formatDateOnly(date)))}
          onSidebarDateChange={(date) => dispatch(sidebarDateChange(date))}
        />
      </div>

      <div className={styles.bottomGradient} />

      <CalendarMobilePopup
        isOpen={showMobile}
        selectedDate={selectedDate}
        currentView={calendar.currentView}
        isGridView={isGridView}
        gridPostCounts={gridPostCounts}
        mobilePosts={mobilePosts}
        isTodaySelected={isSameDay(selectedDate, new Date())}
        listTitle={String(selectedDate.getFullYear())}
        mobileGridTitle={calendar.currentView === 'month' ? getMonthLabel(selectedDate) : formatDayTitle(sidebarDate)}
        onClose={() => setShowMobile(false)}
        onDateChange={(date) => {
          dispatch(setSelectedDate(formatDateOnly(date)));
          if (calendar.currentView !== 'week') setShowMobile(false);
        }}
        onMonthChange={(date) => dispatch(setCountsMonthAnchor(formatDateOnly(date)))}
        onOpenPost={(post) => {
          setShowMobile(false);
          setPreviewPost(post);
        }}
      />

      {previewData && (
        <PostPreviewModal
          isOpen={!!previewPost}
          onClose={() => setPreviewPost(null)}
          channelTitle={previewData.channelTitle}
          channelExtraCount={previewData.channelExtraCount}
          channelPhotoUrl={previewData.channelPhotoUrl ?? undefined}
          channelMembersCount={previewData.channelMembersCount ?? undefined}
          html={previewData.html}
          mediaFiles={previewData.mediaFiles}
          quizData={previewData.quizData}
          inlineKeyboard={previewData.inlineKeyboard}
        />
      )}
    </div>
  );
}
