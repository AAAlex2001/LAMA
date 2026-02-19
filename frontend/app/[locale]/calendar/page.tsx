'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import PostPreviewModal from '@/components/post-preview-modal';
import CalendarHeader from './components/CalendarHeader';
import CalendarMainContent from './components/CalendarMainContent';
import CalendarMobilePopup from './components/CalendarMobilePopup';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import {
  useAppDispatch, useAppSelector,
  setSelectedDate, setCurrentView, setListDateRange, clearListDateRange,
  setListSortOrder, setListStatusFilter, setCountsMonthAnchor,
  selectSortedPosts, selectSidebarPosts, selectMobilePosts,
  selectGridPostCounts, selectDayLoadingMap,
} from './store';
import { fetchCalendarData, fetchMoreListPosts, fetchDayCounts, fetchMoreDayPosts } from './store/thunks';
import { navigateStep, sidebarDateChange } from './store/thunks/navigation';
import { getPreviewData } from './utils/previewData';
import {
  buildCreatePostUrl, parseDate, formatDateOnly,
  formatDayTitle, getMonthDates, getMonthLabel, isSameDay,
} from './utils/calendar-helpers';
import { buildFilterConfigs } from './utils/buildFilterConfigs';
import styles from './calendar.module.scss';

function CalendarPageContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const s = useAppSelector((r) => r.calendar);

  const selectedDate = React.useMemo(() => parseDate(s.selectedDate), [s.selectedDate]);
  const sidebarDate = React.useMemo(() => parseDate(s.sidebarDate), [s.sidebarDate]);
  const listRangeStart = React.useMemo(() => (s.listRangeStart ? parseDate(s.listRangeStart) : null), [s.listRangeStart]);
  const listRangeEnd = React.useMemo(() => (s.listRangeEnd ? parseDate(s.listRangeEnd) : null), [s.listRangeEnd]);

  const sortedPosts = useAppSelector(selectSortedPosts);
  const sidebarPosts = useAppSelector(selectSidebarPosts);
  const mobilePosts = useAppSelector(selectMobilePosts);
  const gridPostCounts = useAppSelector(selectGridPostCounts);
  const dayLoadingMap = useAppSelector(selectDayLoadingMap);
  const isGridView = s.currentView === 'week' || s.currentView === 'month';

  const [showMobile, setShowMobile] = React.useState(false);
  const [previewPost, setPreviewPost] = React.useState<Draft | null>(null);
  const [mobileActiveFilters, setMobileActiveFilters] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => { setMobileActiveFilters({}); }, [s.currentView]);

  React.useEffect(() => {
    dispatch(fetchCalendarData());
  }, [s.currentView, s.selectedDate, s.listRangeStart, s.listRangeEnd, s.listSortOrder, s.listStatusFilter, dispatch]);

  React.useEffect(() => { dispatch(fetchDayCounts()); }, [s.countsMonthAnchor, dispatch]);

  React.useEffect(() => {
    const sel = parseDate(s.selectedDate);
    const anc = parseDate(s.countsMonthAnchor);
    if (sel.getFullYear() !== anc.getFullYear() || sel.getMonth() !== anc.getMonth()) {
      dispatch(setCountsMonthAnchor(formatDateOnly(new Date(sel.getFullYear(), sel.getMonth(), 1))));
    }
  }, [s.selectedDate, dispatch]);

  const mobileFilterConfigs = React.useMemo(() => {
    const isList = s.currentView === 'list';
    return buildFilterConfigs(isGridView ? sidebarPosts : sortedPosts, {
      withDateSort: isList, withStatusFilter: isList, withStatsFilters: isList,
    });
  }, [s.currentView, isGridView, sidebarPosts, sortedPosts]);

  const handleMobileFilterChange = React.useCallback(
    (key: string, values: string[]) => {
      if (key === 'date') dispatch(setListSortOrder(values[0] === 'new' ? 'desc' : values[0] === 'old' ? 'asc' : null));
      if (key === 'status') dispatch(setListStatusFilter(values[0] || null));
      setMobileActiveFilters((prev) => ({ ...prev, [key]: values }));
    },
    [dispatch],
  );

  const previewData = previewPost ? getPreviewData(previewPost) : null;

  return (
    <div className={`${styles.page} ${s.currentView === 'week' ? styles.pageWeek : ''}`}>
      <div className={styles.container}>
        <CalendarHeader
          selectedDate={selectedDate} currentView={s.currentView}
          listRange={listRangeStart && listRangeEnd ? { start: listRangeStart, end: listRangeEnd } : null}
          onListRangeChange={(r) => r ? dispatch(setListDateRange({ start: formatDateOnly(r.start), end: formatDateOnly(r.end) })) : dispatch(clearListDateRange())}
          onPrevDay={() => dispatch(navigateStep('prev') as any)}
          onNextDay={() => dispatch(navigateStep('next') as any)}
          onViewChange={(v) => dispatch(setCurrentView(v))}
          onOpenCalendarPopup={() => setShowMobile(true)}
          gridPostCounts={gridPostCounts}
          onMonthChange={(d) => dispatch(setCountsMonthAnchor(formatDateOnly(d)))}
          listSortOrder={s.listSortOrder}
          onListSortChange={(o) => dispatch(setListSortOrder(o))}
          mobileFilterConfigs={mobileFilterConfigs}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
        />
        <CalendarMainContent
          weekItems={s.weekItems} selectedDate={selectedDate}
          sidebarDate={sidebarDate} isLoading={s.isLoading}
          currentView={s.currentView} sortedPosts={sortedPosts}
          monthDates={getMonthDates(selectedDate)} isGridView={isGridView}
          isLoadingMore={s.isLoadingMore} listSortOrder={s.listSortOrder}
          listStatusFilter={s.listStatusFilter} gridPostCounts={gridPostCounts}
          dayLoadingMap={dayLoadingMap}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
          onEdit={(p) => setPreviewPost(p)}
          onAddPost={(d) => router.push(buildCreatePostUrl(d))}
          onLoadMoreDay={(dk) => dispatch(fetchMoreDayPosts(dk))}
          onLoadMoreList={() => dispatch(fetchMoreListPosts())}
          onListSortChange={(o) => dispatch(setListSortOrder(o))}
          onListStatusChange={(st) => dispatch(setListStatusFilter(st))}
          onMonthChange={(d) => dispatch(setCountsMonthAnchor(formatDateOnly(d)))}
          onSidebarDateChange={(d) => dispatch(sidebarDateChange(d) as any)}
        />
      </div>
      <div className={styles.bottomGradient} />
      <CalendarMobilePopup
        isOpen={showMobile} selectedDate={selectedDate}
        currentView={s.currentView} isGridView={isGridView}
        gridPostCounts={gridPostCounts} mobilePosts={mobilePosts}
        isTodaySelected={isSameDay(selectedDate, new Date())}
        listTitle={String(selectedDate.getFullYear())}
        mobileGridTitle={s.currentView === 'month' ? getMonthLabel(selectedDate) : formatDayTitle(sidebarDate)}
        onClose={() => setShowMobile(false)}
        onDateChange={(d) => { dispatch(setSelectedDate(formatDateOnly(d))); if (s.currentView !== 'week') setShowMobile(false); }}
        onMonthChange={(d) => dispatch(setCountsMonthAnchor(formatDateOnly(d)))}
        onOpenPost={(p) => { setShowMobile(false); setPreviewPost(p); }}
      />
      {previewData && (
        <PostPreviewModal
          isOpen={!!previewPost} onClose={() => setPreviewPost(null)}
          channelTitle={previewData.channelTitle}
          channelExtraCount={previewData.channelExtraCount}
          channelPhotoUrl={previewData.channelPhotoUrl ?? undefined}
          channelMembersCount={previewData.channelMembersCount ?? undefined}
          html={previewData.html} mediaFiles={previewData.mediaFiles}
          quizData={previewData.quizData} inlineKeyboard={previewData.inlineKeyboard}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AppLayout pageTitle="Календарь">
      <CalendarProvider><CalendarPageContent /></CalendarProvider>
    </AppLayout>
  );
}
