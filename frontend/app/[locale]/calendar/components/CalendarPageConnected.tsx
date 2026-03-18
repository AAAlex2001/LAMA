'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import PostPreviewModal from '@/components/post-preview-modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Draft, TagsResponse, ChannelsResponse } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import CalendarHeader from './CalendarHeader';
import CalendarMainContent from './CalendarMainContent';
import CalendarMobilePopup from './CalendarMobilePopup';
import CalendarPostModal from './CalendarPostModal';
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
  selectSidebarPosts,
  selectMonthStatusCounts,
  removeItem,
} from '../store';
import { fetchCalendarData, fetchMoreListPosts, fetchDayCounts, fetchMoreDayPosts } from '../store/thunks';
import { navigateStep, sidebarDateChange } from '../store/thunks/navigation';
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
  const { showSuccess, showError } = useNotifications();

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
  const sidebarPosts = useAppSelector(selectSidebarPosts);
  const monthStatusCounts = useAppSelector(selectMonthStatusCounts);

  const [showMobile, setShowMobile] = React.useState(false);
  const [previewPost, setPreviewPost] = React.useState<Draft | null>(null);
  const [selectedPost, setSelectedPost] = React.useState<Draft | null>(null);
  const [mobileActiveFilters, setMobileActiveFilters] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    setMobileActiveFilters({});
  }, [calendar.currentView]);

  React.useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, [calendar.currentView, calendar.selectedDate]);

  useQuery({
    queryKey: [
      'calendar-data',
      calendar.currentView,
      calendar.selectedDate,
      calendar.currentView === 'month' ? calendar.sidebarDate : null,
      calendar.listRangeStart,
      calendar.listRangeEnd,
      calendar.listSortOrder,
      calendar.listStatusFilter,
    ],
    queryFn: async () => dispatch(fetchCalendarData()).unwrap(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  useQuery({
    queryKey: ['calendar-day-counts', calendar.countsMonthAnchor],
    queryFn: async () => dispatch(fetchDayCounts()).unwrap(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const { data: allTags } = useQuery({
    queryKey: ['calendar-all-tags'],
    queryFn: () => apiRequest<TagsResponse>('/publications/tags/?page=1&page_size=50'),
    staleTime: Infinity,
  });

  const { data: allChannels } = useQuery({
    queryKey: ['calendar-all-channels'],
    queryFn: () => apiRequest<ChannelsResponse>('/channels/?page=1&page_size=200'),
    staleTime: Infinity,
  });

  function handleLoadMoreList() {
    dispatch(fetchMoreListPosts());
  }

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
      && (
        view === 'day'
        || (view === 'week' && (calendar.currentView === 'month' || calendar.currentView === 'list'))
      )
    ) {
      dispatch(setSelectedDate(calendar.sidebarDate));
    }
    dispatch(setCurrentView(view));
    const anchor = `${calendar.selectedDate.slice(0, 7)}-01`;
    if (calendar.countsMonthAnchor !== anchor) {
      dispatch(setCountsMonthAnchor(anchor));
    }
  }

  const previewData = previewPost ? getPreviewData(previewPost) : null;

  const nonListFilterSourcePosts =
    calendar.currentView === 'day'
      ? sortedPosts
      : calendar.currentView === 'week' || calendar.currentView === 'month'
        ? Object.values(calendar.weekItems).flat()
        : [] as Draft[];

  const filterOpts = {
    allChannels: allChannels?.items,
    allTags: allTags?.items,
  };

  const desktopFilterConfigs =
    calendar.currentView === 'list' ? [] : buildFilterConfigs(nonListFilterSourcePosts, filterOpts);

  const mobileFilterConfigs = React.useMemo(() => {
    const isList = calendar.currentView === 'list';
    const posts = isGridView ? sidebarPosts : sortedPosts;
    return buildFilterConfigs(posts, {
      withDateSort: isList,
      withStatusFilter: isList,
      withStatsFilters: isList,
      ...filterOpts,
    });
  }, [calendar.currentView, isGridView, sidebarPosts, sortedPosts, allChannels, allTags]);

  const filteredSortedPosts =
    calendar.currentView === 'list' ? sortedPosts : applyPostFilters(sortedPosts, mobileActiveFilters);

  const filteredWeekItems: Record<string, Draft[]> =
    calendar.currentView === 'list'
      ? calendar.weekItems
      : Object.fromEntries(
        Object.entries(calendar.weekItems).map(([dateKey, posts]) => [
          dateKey,
          applyPostFilters(posts, mobileActiveFilters),
        ]),
      );

  const filteredMobilePosts =
    calendar.currentView === 'list' ? mobilePosts : applyPostFilters(mobilePosts, mobileActiveFilters);

  function handlePostClick(post: Draft) {
    if (post.is_bot_message) return;
    setSelectedPost(post);
  }

  function handlePreviewFromModal() {
    if (!selectedPost) return;
    setPreviewPost(selectedPost);
    setSelectedPost(null);
  }

  function handleEditFromModal() {
    if (!selectedPost) return;
    window.location.href = `/edit-draft?draft=${selectedPost.id}`;
  }

  async function handleDeleteFromModal() {
    if (!selectedPost) return;
    const token = localStorage.getItem('lamaplanner_access_token');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${selectedPost.id}`,
        {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (!response.ok) {
        throw new Error('Не удалось удалить публикацию');
      }

      dispatch(removeItem(selectedPost.id));
      setSelectedPost(null);
      showSuccess('Публикация удалена');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка удаления публикации');
    }
  }

  async function handleShareFromModal() {
    if (!selectedPost) return;
    const token = localStorage.getItem('lamaplanner_access_token');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${selectedPost.id}/share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error('Не удалось сгенерировать ссылку');
      }

      const data = await response.json();
      const link = `${window.location.origin}/drafts?token=${data.share_token}`;
      await navigator.clipboard.writeText(link);
      showSuccess('Ссылка скопирована');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка шаринга');
    }
  }

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
          onEdit={handlePostClick}
          onAddPost={(date) => router.push(buildCreatePostUrl(date))}
          onLoadMoreDay={(dateKey) => dispatch(fetchMoreDayPosts(dateKey))}
          onLoadMoreList={handleLoadMoreList}
          onListSortChange={(order) => dispatch(setListSortOrder(order))}
          onListStatusChange={(status) => dispatch(setListStatusFilter(status))}
          onMonthChange={(date) => dispatch(setCountsMonthAnchor(formatDateOnly(date)))}
          onSidebarDateChange={(date) => dispatch(sidebarDateChange(date))}
          allChannels={allChannels?.items}
          allTags={allTags?.items}
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
          handlePostClick(post);
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

      <CalendarPostModal
        isOpen={!!selectedPost}
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onPreview={handlePreviewFromModal}
        onShare={handleShareFromModal}
        onDelete={handleDeleteFromModal}
        onEdit={handleEditFromModal}
      />
    </div>
  );
}
