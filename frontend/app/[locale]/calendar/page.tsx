'use client';

import React from 'react';
import { CalendarProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import PostPreviewModal from '@/components/post-preview-modal';
import CalendarHeader from './components/CalendarHeader';
import CalendarMainContent from './components/CalendarMainContent';
import CalendarMobilePopup from './components/CalendarMobilePopup';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import type { FilterConfig } from './components/ListFilterBar';
import { useCalendarData } from './hooks/useCalendarData';
import { draftToMediaFiles } from './utils/calendar-helpers';
import styles from './calendar.module.scss';

function CalendarPageContent() {
  const [showMobileCalendar, setShowMobileCalendar] = React.useState(false);
  const [previewPost, setPreviewPost] = React.useState<Draft | null>(null);
  const {
    weekItems,
    isLoading,
    currentView,
    selectedDate,
    sidebarDate,
    listRangeStart,
    listRangeEnd,
    listSortOrder,
    listStatusFilter,
    sortedPosts,
    sidebarPosts,
    mobilePosts,
    gridPostCounts,
    monthDates,
    isGridView,
    isLoadingMore,
    isTodaySelected,
    mobileGridTitle,
    listTitle,
    dayLoadingMap,
    changeDate,
    changeSidebarDate,
    setListDateRange,
    clearListDateRange,
    setListSortOrder,
    setListStatusFilter,
    handlePrevDay,
    handleNextDay,
    handleViewChange,
    handleLoadMoreDay,
    setCountsMonthAnchor,
  } = useCalendarData();

  const [mobileActiveFilters, setMobileActiveFilters] = React.useState<Record<string, string[]>>({});

  // Reset mobile filters when view changes
  React.useEffect(() => {
    setMobileActiveFilters({});
  }, [currentView]);

  const mobileFilterConfigs: FilterConfig[] = React.useMemo(() => {
    const postsForFilters = isGridView ? sidebarPosts : sortedPosts;

    const channelMap = new Map<string, string>();
    const tagMap = new Map<string, { name: string; color?: string }>();
    const mediaTypeSet = new Set<string>();

    const mediaTypeLabels: Record<string, string> = {
      photo: 'Фото',
      video: 'Видео',
      audio: 'Аудио',
      doc: 'Документ',
      gif: 'GIF',
    };

    postsForFilters.forEach((post) => {
      post.channels?.forEach((ch) => {
        channelMap.set(String(ch.id), ch.title || `Канал ${ch.id}`);
      });
      post.tags?.forEach((tag) => {
        tagMap.set(String(tag.id), { name: tag.name, color: tag.color });
      });
      if (post.media_urls?.length) {
        for (const url of post.media_urls) {
          const ext = url.split('.').pop()?.toLowerCase() || '';
          if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) mediaTypeSet.add('photo');
          else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) mediaTypeSet.add('video');
          else if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'wma'].includes(ext)) mediaTypeSet.add('audio');
          else if (['gif'].includes(ext)) mediaTypeSet.add('gif');
          else mediaTypeSet.add('doc');
        }
      }
    });

    const configs: FilterConfig[] = [];

    if (currentView === 'list') {
      configs.push({
        key: 'date',
        label: 'По дате',
        multiSelect: false,
        options: [
          { value: 'new', label: 'Сначала новые' },
          { value: 'old', label: 'Сначала старые' },
        ],
      });
    }

    if (channelMap.size > 0) {
      configs.push({
        key: 'channel',
        label: 'По каналам',
        multiSelect: true,
        options: Array.from(channelMap.entries()).map(([id, title]) => ({
          value: id,
          label: title,
        })),
      });
    }

    if (tagMap.size > 0) {
      configs.push({
        key: 'tag',
        label: 'По тегам',
        multiSelect: true,
        options: Array.from(tagMap.entries()).map(([id, { name, color }]) => ({
          value: id,
          label: name,
          color,
        })),
      });
    }

    if (mediaTypeSet.size > 0) {
      configs.push({
        key: 'media',
        label: 'По типу контента',
        multiSelect: true,
        options: Array.from(mediaTypeSet).map((t) => ({
          value: t,
          label: mediaTypeLabels[t] || t,
        })),
      });
    }

    if (currentView === 'list') {
      configs.push({
        key: 'status',
        label: 'По статусу',
        multiSelect: false,
        options: [
          { value: 'draft', label: 'Черновик' },
          { value: 'scheduled', label: 'Запланирован' },
          { value: 'published', label: 'Опубликован' },
          { value: 'failed', label: 'Ошибка' },
        ],
      });

      configs.push({
        key: 'views',
        label: 'По просмотрам',
        multiSelect: false,
        options: [
          { value: 'gt1000', label: 'Более 1000' },
          { value: '100to1000', label: '100 - 1000' },
          { value: 'lt100', label: 'Менее 100' },
        ],
      });

      configs.push({
        key: 'reactions',
        label: 'По реакциям',
        multiSelect: false,
        options: [
          { value: 'gt100', label: 'Более 100' },
          { value: '10to100', label: '10 - 100' },
          { value: 'lt10', label: 'Менее 10' },
        ],
      });
    }

    return configs;
  }, [currentView, isGridView, sidebarPosts, sortedPosts]);

  function handleMobileFilterChange(key: string, values: string[]) {
    if (key === 'date') {
      const value = values[0] || null;
      setListSortOrder(value === 'new' ? 'desc' : value === 'old' ? 'asc' : null);
    }
    if (key === 'status') {
      setListStatusFilter(values[0] || null);
    }
    setMobileActiveFilters((prev) => ({ ...prev, [key]: values }));
  }

  function handleDateChange(date: Date) {
    changeDate(date);
    if (currentView !== 'week') {
      setShowMobileCalendar(false);
    }
  }

  function handleListRangeChange(range: { start: Date; end: Date } | null) {
    if (!range) {
      clearListDateRange();
      return;
    }
    setListDateRange(range.start, range.end);
  }

  function handleSidebarDateChange(date: Date) {
    if (currentView === 'week') {
      changeSidebarDate(date);
      // If the selected day is in a different week, navigate the main calendar too
      const getWeekStart = (d: Date) => {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.getFullYear(), d.getMonth(), diff);
      };
      const currentWeekStart = getWeekStart(selectedDate);
      const newWeekStart = getWeekStart(date);
      if (currentWeekStart.getTime() !== newWeekStart.getTime()) {
        changeDate(date);
      }
    } else if (currentView === 'month') {
      changeSidebarDate(date);
      // If the selected day is in a different month, navigate the main calendar too
      if (date.getMonth() !== selectedDate.getMonth() || date.getFullYear() !== selectedDate.getFullYear()) {
        changeDate(date);
      }
    } else {
      // Day view: navigate to the selected day (triggers data fetch)
      changeDate(date);
    }
  }

  function handleAddPost(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    window.location.href = `/create-post?date=${yyyy}-${mm}-${dd}`;
  }

  function handleEdit(post: Draft) {
    setPreviewPost(post);
  }

  function handleMobileOpenPost(post: Draft) {
    setShowMobileCalendar(false);
    setPreviewPost(post);
  }

  const previewData = (() => {
    if (!previewPost) return null;
    const channel = previewPost.channels?.[0];
    const extraCount = previewPost.channels?.length > 1
      ? `+${previewPost.channels.length - 1}`
      : undefined;
    return {
      channelTitle: channel?.title,
      channelPhotoUrl: channel?.photo_url,
      channelMembersCount: channel?.members_count,
      channelExtraCount: extraCount,
      html: previewPost.formatted_content?.text || previewPost.text_content || '',
      mediaFiles: draftToMediaFiles(previewPost),
      inlineKeyboard: previewPost.inline_keyboard?.buttons?.length
        ? { buttons: previewPost.inline_keyboard.buttons }
        : undefined,
      quizData: previewPost.poll_data?.question ? {
        mode: (previewPost.poll_data.is_quiz ? 'quiz' : 'poll') as 'quiz' | 'poll',
        question: previewPost.poll_data.question,
        options: previewPost.poll_data.options,
        isAnonymous: previewPost.poll_data.is_anonymous ?? true,
        allowsMultipleAnswers: previewPost.poll_data.allows_multiple_answers ?? false,
        correctAnswerIndex: previewPost.poll_data.correct_option_id ?? undefined,
      } : undefined,
    };
  })();

  return (
    <div className={`${styles.page} ${currentView === 'week' ? styles.pageWeek : ''}`}>
      <div className={styles.container}>
        <CalendarHeader
          selectedDate={selectedDate}
          currentView={currentView}
          listRange={listRangeStart && listRangeEnd ? { start: listRangeStart, end: listRangeEnd } : null}
          onListRangeChange={handleListRangeChange}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onViewChange={handleViewChange}
          onOpenCalendarPopup={() => setShowMobileCalendar(true)}
          gridPostCounts={gridPostCounts}
          onMonthChange={setCountsMonthAnchor}
          listSortOrder={listSortOrder}
          onListSortChange={setListSortOrder}
          mobileFilterConfigs={mobileFilterConfigs}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
        />

        <CalendarMainContent
          weekItems={weekItems}
          selectedDate={selectedDate}
          sidebarDate={sidebarDate}
          isLoading={isLoading}
          currentView={currentView}
          sortedPosts={sortedPosts}
          monthDates={monthDates}
          isGridView={isGridView}
          isLoadingMore={isLoadingMore}
          listSortOrder={listSortOrder}
          listStatusFilter={listStatusFilter}
          gridPostCounts={gridPostCounts}
          dayLoadingMap={dayLoadingMap}
          mobileActiveFilters={mobileActiveFilters}
          onMobileFilterChange={handleMobileFilterChange}
          onEdit={handleEdit}
          onAddPost={handleAddPost}
          onLoadMoreDay={handleLoadMoreDay}
          onListSortChange={setListSortOrder}
          onListStatusChange={setListStatusFilter}
          onMonthChange={setCountsMonthAnchor}
          onSidebarDateChange={handleSidebarDateChange}
        />
      </div>

      <div className={styles.bottomGradient} />

      <CalendarMobilePopup
        isOpen={showMobileCalendar}
        selectedDate={selectedDate}
        currentView={currentView}
        isGridView={isGridView}
        gridPostCounts={gridPostCounts}
        mobilePosts={mobilePosts}
        isTodaySelected={isTodaySelected}
        listTitle={listTitle}
        mobileGridTitle={mobileGridTitle}
        onClose={() => setShowMobileCalendar(false)}
        onDateChange={handleDateChange}
        onMonthChange={setCountsMonthAnchor}
        onOpenPost={handleMobileOpenPost}
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

export default function CalendarPage() {
  return (
    <AppLayout pageTitle="Календарь">
      <CalendarProvider>
        <CalendarPageContent />
      </CalendarProvider>
    </AppLayout>
  );
}
