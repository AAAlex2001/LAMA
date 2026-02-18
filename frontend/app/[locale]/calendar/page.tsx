'use client';

import React from 'react';
import { CalendarProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import PostPreviewModal from '@/components/post-preview-modal';
import CalendarHeader from './components/CalendarHeader';
import CalendarMainContent from './components/CalendarMainContent';
import CalendarMobilePopup from './components/CalendarMobilePopup';
import type { Draft } from '@/app/[locale]/create-post/store/types';
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
    sortedPosts,
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
    handlePrevDay,
    handleNextDay,
    handleViewChange,
    handleLoadMoreDay,
    setCountsMonthAnchor,
  } = useCalendarData();

  function handleDateChange(date: Date) {
    changeDate(date);
    if (currentView !== 'week') {
      setShowMobileCalendar(false);
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
    <div className={`${styles.page} ${isGridView ? styles.pageWeek : ''}`}>
      <div className={styles.container}>
        <CalendarHeader
          selectedDate={selectedDate}
          currentView={currentView}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onViewChange={handleViewChange}
          onSettingsClick={() => setShowMobileCalendar(true)}
        />

        <CalendarMainContent
          weekItems={weekItems}
          selectedDate={selectedDate}
          isLoading={isLoading}
          currentView={currentView}
          sortedPosts={sortedPosts}
          monthDates={monthDates}
          isGridView={isGridView}
          isLoadingMore={isLoadingMore}
          gridPostCounts={gridPostCounts}
          dayLoadingMap={dayLoadingMap}
          onEdit={handleEdit}
          onAddPost={handleAddPost}
          onLoadMoreDay={handleLoadMoreDay}
          onMonthChange={setCountsMonthAnchor}
          onDateChange={handleDateChange}
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
