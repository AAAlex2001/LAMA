'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import PostPreviewModal from '@/components/post-preview-modal';
import Modal from '@/components/modal';
import Input from '@/components/input/input';
import Loader from '@/components/loader';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import type { Draft } from '@/types/post';
import type { TagsResponse, ChannelsResponse } from '@/types';
import { apiRequest } from '@/store/api';
import CalendarHeader from './CalendarHeader';
import CalendarMainContent from './CalendarMainContent';
import CalendarMobilePopup from './CalendarMobilePopup';
import CalendarPostModal from './CalendarPostModal';
import {
  useAppDispatch,
  useAppSelector,
  type RootState,
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

  const calendar = useAppSelector((state: RootState) => state.calendar);
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
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState('');
  const [isGeneratingShareLink, setIsGeneratingShareLink] = React.useState(false);
  const [deleteConfirmPost, setDeleteConfirmPost] = React.useState<Draft | null>(null);

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

  function handleDeleteFromModal() {
    if (!selectedPost) return;
    setDeleteConfirmPost(selectedPost);
    setSelectedPost(null);
  }

  async function confirmDelete() {
    if (!deleteConfirmPost) return;
    const token = localStorage.getItem('lamaplanner_access_token');
    const isPublished = deleteConfirmPost.status === 'published' || deleteConfirmPost.status === 'partial_success';

    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${deleteConfirmPost.id}`);
      if (isPublished) {
        url.searchParams.set('delete_from_channel', 'true');
      }
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить публикацию');
      }

      dispatch(removeItem(deleteConfirmPost.id));
      setDeleteConfirmPost(null);
      showSuccess('Публикация удалена');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка удаления публикации');
    }
  }

  async function handleShareFromModal() {
    if (!selectedPost) return;
    const token = localStorage.getItem('lamaplanner_access_token');

    setShareModalOpen(true);
    setShareLink('');
    setIsGeneratingShareLink(true);
    setSelectedPost(null);

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
      setShareLink(`${window.location.origin}/drafts?token=${data.share_token}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка шаринга');
      setShareModalOpen(false);
    } finally {
      setIsGeneratingShareLink(false);
    }
  }

  return (
    <div className={`${styles.page} ${calendar.currentView === 'week' ? styles.pageWeek : ''} ${calendar.currentView === 'month' ? styles.pageMonth : ''}`}>
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

      <Modal
        isOpen={!!deleteConfirmPost}
        onClose={() => setDeleteConfirmPost(null)}
        onConfirm={confirmDelete}
        title="Удалить публикацию?"
        confirmText="Удалить"
        cancelText="Отмена"
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: '#0D0D0D' }}>
          {deleteConfirmPost?.status === 'published' || deleteConfirmPost?.status === 'partial_success'
            ? 'Публикация будет удалена из календаря и из канала в Telegram. Это действие нельзя отменить.'
            : 'Публикация будет удалена. Это действие нельзя отменить.'}
        </p>
      </Modal>

      <div className={styles.shareModal}>
        <Modal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          onConfirm={() => setShareModalOpen(false)}
          title="Поделиться постом"
          hideButtons
        >
          <div className={styles.shareModalContent}>
            <p className={styles.shareDescription}>
              Вы можете скопировать ссылку и отправить её удобным способом или нажать на иконку Telegram, после чего выбрать чат и поделиться ссылкой напрямую.<br /><br />
              <strong>Внимание:</strong> ссылка действительна <strong>7 дней</strong> и может быть использована <strong>только один раз</strong>.
            </p>
            <div className={styles.shareLinkRow}>
              <div className={styles.shareLinkInput}>
                <Input
                  value={shareLink}
                  onChange={() => {}}
                  variant="white"
                  icon={<CopyIcon width={24} height={24} color="#383F45" />}
                  iconDisabled={isGeneratingShareLink || !shareLink}
                  onIconClick={() => {
                    if (!isGeneratingShareLink && shareLink) {
                      navigator.clipboard.writeText(shareLink);
                      showSuccess('Ссылка скопирована!');
                    }
                  }}
                />
                {isGeneratingShareLink && (
                  <div className={styles.shareLinkLoader}>
                    <Loader size={16} color="blue" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.telegramBtn}
                onClick={() => {
                  if (!isGeneratingShareLink && shareLink) {
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                  }
                }}
                disabled={isGeneratingShareLink || !shareLink}
              >
                <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
