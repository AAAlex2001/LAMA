'use client';

import { useRouter } from 'next/navigation';
import PostPreviewModal from '@/components/post-preview-modal';
import type { Draft } from '@/types/post';
import CalendarHeader from './CalendarHeader';
import CalendarMainContent from './CalendarMainContent';
import CalendarMobilePopup from './CalendarMobilePopup';
import CalendarPostModal from './CalendarPostModal';
import DeletePostModal from './modals/DeletePostModal';
import DeleteRepeatModal from './modals/DeleteRepeatModal';
import SharePostModal from './modals/SharePostModal';
import {
  useAppDispatch,
  setSelectedDate,
  setCurrentView,
  setListDateRange,
  clearListDateRange,
  setListSortOrder,
  setListStatusFilter,
  setCountsMonthAnchor,
} from '../store';
import { fetchMoreListPosts, fetchMoreDayPosts } from '../store/thunks';
import { navigateStep, sidebarDateChange } from '../store/thunks/navigation';
import { useCalendarPageData } from '../hooks/useCalendarPageData';
import { useCalendarPostActions } from '../hooks/useCalendarPostActions';
import { getPreviewData } from '../utils/previewData';
import {
  buildCreatePostUrl,
  formatDateOnly,
  formatDayTitle,
  getMonthLabel,
  isSameDay,
} from '../utils/calendar-helpers';
import { buildFilterConfigs } from '../utils/buildFilterConfigs';
import { applyPostFilters } from '../utils/filterPosts';
import styles from '../calendar.module.scss';

export default function CalendarPageConnected() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const data = useCalendarPageData();
  const actions = useCalendarPostActions();

  const {
    calendar, selectedDate, sidebarDate, listRangeStart, listRangeEnd,
    sortedPosts, mobilePosts, sidebarPosts, gridPostCounts, monthStatusCounts,
    dayLoadingMap, dayHasMoreMap, isGridView, allTags, allChannels,
    showMobile, setShowMobile, mobileActiveFilters, setMobileActiveFilters,
  } = data;

  function handleHeaderArrowClick(direction: 'prev' | 'next') {
    const isMobile = window.matchMedia('(max-width: 1439px)').matches;
    if (calendar.currentView === 'week' && isMobile) {
      setShowMobile(true);
      return;
    }
    dispatch(navigateStep(direction));
  }

  function handleMobileFilterChange(key: string, values: string[]) {
    if (key === 'date') {
      dispatch(setListSortOrder(values[0] === 'new' ? 'desc' : values[0] === 'old' ? 'asc' : null));
    }
    if (key === 'status') {
      dispatch(setListStatusFilter(values[0] || null));
    }
    setMobileActiveFilters((prev) => ({ ...prev, [key]: values }));
  }

  function handleViewChange(view: typeof calendar.currentView) {
    if (
      calendar.sidebarDate !== calendar.selectedDate
      && (view === 'day'
        || (view === 'week' && (calendar.currentView === 'month' || calendar.currentView === 'list')))
    ) {
      dispatch(setSelectedDate(calendar.sidebarDate));
    }
    dispatch(setCurrentView(view));
    const anchor = `${calendar.selectedDate.slice(0, 7)}-01`;
    if (calendar.countsMonthAnchor !== anchor) {
      dispatch(setCountsMonthAnchor(anchor));
    }
  }

  const previewData = actions.previewPost ? getPreviewData(actions.previewPost) : null;

  const nonListFilterSourcePosts =
    calendar.currentView === 'day'
      ? sortedPosts
      : calendar.currentView === 'week' || calendar.currentView === 'month'
        ? Object.values(calendar.weekItems).flat()
        : [] as Draft[];

  const filterOpts = { allChannels, allTags };
  const isList = calendar.currentView === 'list';

  const desktopFilterConfigs =
    isList ? [] : buildFilterConfigs(nonListFilterSourcePosts, filterOpts);

  const mobileFilterConfigs = buildFilterConfigs(isGridView ? sidebarPosts : sortedPosts, {
    withDateSort: isList,
    withStatusFilter: isList,
    withStatsFilters: isList,
    ...filterOpts,
  });

  const filteredSortedPosts = isList ? sortedPosts : applyPostFilters(sortedPosts, mobileActiveFilters);
  const filteredMobilePosts = isList ? mobilePosts : applyPostFilters(mobilePosts, mobileActiveFilters);
  const filteredWeekItems: Record<string, Draft[]> = isList
    ? calendar.weekItems
    : Object.fromEntries(
      Object.entries(calendar.weekItems).map(([dateKey, posts]) => [
        dateKey,
        applyPostFilters(posts, mobileActiveFilters),
      ]),
    );

  const pageClass = `${styles.page} ${calendar.currentView === 'week' ? styles.pageWeek : ''} ${calendar.currentView === 'month' ? styles.pageMonth : ''} ${isList ? styles.pageList : ''}`;

  return (
    <div className={pageClass}>
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
          onPrevDay={() => handleHeaderArrowClick('prev')}
          onNextDay={() => handleHeaderArrowClick('next')}
          onViewChange={handleViewChange}
          onOpenCalendarPopup={() => setShowMobile(true)}
          gridPostCounts={gridPostCounts}
          onMonthChange={(date) => dispatch(setCountsMonthAnchor(formatDateOnly(date)))}
          listSortOrder={calendar.listSortOrder}
          onListSortChange={(order) => dispatch(setListSortOrder(order))}
          mobileFilterConfigs={mobileFilterConfigs}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
          desktopFilterConfigs={desktopFilterConfigs}
          desktopActiveFilters={mobileActiveFilters}
          onDesktopFilterChange={handleMobileFilterChange}
        />

        <CalendarMainContent
          weekItems={filteredWeekItems}
          selectedDate={selectedDate}
          sidebarDate={sidebarDate}
          isLoading={calendar.isLoading}
          currentView={calendar.currentView}
          sortedPosts={filteredSortedPosts}
          isGridView={isGridView}
          isLoadingMore={calendar.isLoadingMore}
          hasMore={calendar.hasMore}
          listSortOrder={calendar.listSortOrder}
          listStatusFilter={calendar.listStatusFilter}
          gridPostCounts={gridPostCounts}
          statusCounts={monthStatusCounts}
          dayLoadingMap={dayLoadingMap}
          dayHasMoreMap={dayHasMoreMap}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
          onEdit={actions.openPost}
          onAddPost={(date) => router.push(buildCreatePostUrl(date))}
          onLoadMoreDay={(dateKey) => dispatch(fetchMoreDayPosts(dateKey))}
          onLoadMoreList={() => dispatch(fetchMoreListPosts())}
          onListSortChange={(order) => dispatch(setListSortOrder(order))}
          onListStatusChange={(status) => dispatch(setListStatusFilter(status))}
          onMonthChange={(date) => dispatch(setCountsMonthAnchor(formatDateOnly(date)))}
          onSidebarDateChange={(date) => dispatch(sidebarDateChange(date))}
          allChannels={allChannels}
          allTags={allTags}
        />
      </div>

      <div className={styles.bottomGradient} />

      <CalendarMobilePopup
        isOpen={showMobile}
        selectedDate={selectedDate}
        currentView={calendar.currentView}
        isGridView={isGridView}
        gridPostCounts={gridPostCounts}
        mobilePosts={filteredMobilePosts}
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
          actions.openPost(post);
        }}
      />

      {previewData && (
        <PostPreviewModal
          isOpen={!!actions.previewPost}
          onClose={() => actions.setPreviewPost(null)}
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

      <CalendarPostModal
        isOpen={!!actions.selectedPost}
        post={actions.selectedPost}
        onClose={() => actions.setSelectedPost(null)}
        onPreview={actions.previewSelected}
        onShare={actions.startShareSelected}
        onDelete={actions.startDeleteSelected}
        onEdit={actions.selectedPost?.status === 'draft' || actions.selectedPost?.status === 'scheduled' ? actions.editSelected : undefined}
      />

      <DeletePostModal
        post={actions.deleteConfirmPost}
        onClose={() => actions.setDeleteConfirmPost(null)}
        onConfirm={actions.confirmDelete}
      />

      <DeleteRepeatModal
        isOpen={!!actions.repeatDeletePost}
        onClose={() => actions.setRepeatDeletePost(null)}
        onConfirm={actions.confirmRepeatDelete}
      />

      <SharePostModal
        postId={actions.sharingPostId}
        onClose={() => actions.setSharingPostId(null)}
      />
    </div>
  );
}
