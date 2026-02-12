'use client';

import React from 'react';
import { CalendarProvider } from './store/provider';
import { useAppDispatch, useAppSelector } from './store';
import { setSelectedDate, setCurrentView } from './store';
import type { CalendarView } from './store';
import { fetchCalendarPosts, fetchWeeklyPosts } from './store/thunks';
import { AppLayout } from '@/components/app-layout';
import type { MediaFile } from '@/components/media-preview';
import DatePicker from '@/components/date-picker/date-picker';
import PostPreviewModal from '@/components/post-preview-modal';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import CalendarHeader from './components/CalendarHeader';
import CalendarList from './components/CalendarList';
import CalendarSidebar from './components/CalendarSidebar';
import WeeklyCalendarView from './components/WeeklyCalendarView';
import WeeklySidebar from './components/WeeklySidebar';
import type { Draft, DraftListResponse } from '@/app/[locale]/create-post/store/types';
import styles from './calendar.module.scss';

const DAY_NAMES_FULL: Record<number, string> = {
  0: 'воскресенье',
  1: 'понедельник',
  2: 'вторник',
  3: 'среда',
  4: 'четверг',
  5: 'пятница',
  6: 'суббота',
};

const MONTH_NAMES_GEN: string[] = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDayTitle(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_GEN[date.getMonth()];
  const weekDay = DAY_NAMES_FULL[date.getDay()];
  return `${day} ${month}, ${weekDay}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getPreviewText(post: Draft): string {
  const html =
    post.formatted_content?.html ||
    post.formatted_content?.text ||
    post.text_content ||
    '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'document';
}

function draftToMediaFiles(draft: Draft): MediaFile[] {
  if (!draft.media_urls?.length) return [];
  return draft.media_urls.map((url, index) => ({
    id: `calendar-media-${draft.id}-${index}`,
    url,
    type: getMediaType(url),
    blur: draft.media_blur?.[index] ?? false,
    thumbnail_url: draft.media_thumbnail_urls?.[index] ?? null,
    telegram_file_id: draft.media_file_ids?.[index] ?? null,
  }));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekStartKey(dateStr: string): string {
  const parts = dateStr.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function CalendarPageContent() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(state => state.calendar.items);
  const weekItems = useAppSelector(state => state.calendar.weekItems);
  const isLoading = useAppSelector(state => state.calendar.isLoading);
  const selectedDateStr = useAppSelector(state => state.calendar.selectedDate);
  const currentView = useAppSelector(state => state.calendar.currentView);
  const [showMobileCalendar, setShowMobileCalendar] = React.useState(false);
  const [monthPostCounts, setMonthPostCounts] = React.useState<Record<string, number>>({});
  const [previewPost, setPreviewPost] = React.useState<Draft | null>(null);
  const [countsMonthAnchor, setCountsMonthAnchor] = React.useState<Date>(new Date());
  const lastFetchedWeekKeyRef = React.useRef<string>('');

  const selectedDate = React.useMemo(() => {
    const parts = selectedDateStr.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }, [selectedDateStr]);

  React.useEffect(() => {
    setCountsMonthAnchor(selectedDate);
  }, [selectedDate]);

  React.useEffect(() => {
    if (currentView === 'week') {
      const weekKey = getWeekStartKey(selectedDateStr);
      if (lastFetchedWeekKeyRef.current === weekKey) {
        return;
      }
      lastFetchedWeekKeyRef.current = weekKey;
      dispatch(fetchWeeklyPosts({ date: selectedDateStr }));
    } else {
      lastFetchedWeekKeyRef.current = '';
      dispatch(fetchCalendarPosts({ date: selectedDateStr }));
    }
  }, [dispatch, selectedDateStr, currentView]);

  React.useEffect(() => {
    if (currentView !== 'week') {
      setMonthPostCounts({});
      return;
    }

    let isCancelled = false;

    const fetchMonthPostCounts = async () => {
      const year = countsMonthAnchor.getFullYear();
      const month = countsMonthAnchor.getMonth();

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const startDate = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
      const endDate = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

      try {
        const counts: Record<string, number> = {};
        let page = 1;
        const pageSize = 500;

        while (!isCancelled) {
          const queryParams = new URLSearchParams({
            page: String(page),
            page_size: String(pageSize),
            start_date: `${startDate}T00:00:00`,
            end_date: `${endDate}T23:59:59`,
          });

          const response = await apiRequest<DraftListResponse>(`/publications?${queryParams}`);

          for (const post of response.items) {
            const sourceDate =
              (post as any).scheduled_time ||
              post.updated_at ||
              post.created_at;

            if (!sourceDate) continue;
            const date = new Date(sourceDate);
            if (Number.isNaN(date.getTime())) continue;

            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
          }

          if (response.items.length < pageSize) {
            break;
          }

          page += 1;
        }

        if (isCancelled) return;
        setMonthPostCounts(counts);
      } catch {
        if (!isCancelled) {
          setMonthPostCounts({});
        }
      }
    };

    fetchMonthPostCounts();

    return () => {
      isCancelled = true;
    };
  }, [currentView, countsMonthAnchor.getFullYear(), countsMonthAnchor.getMonth()]);

  const changeDate = React.useCallback((date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    dispatch(setSelectedDate(`${yyyy}-${mm}-${dd}`));
    if (currentView !== 'week') {
      setShowMobileCalendar(false);
    }
  }, [dispatch, currentView]);

  const handlePrevDay = React.useCallback(() => {
    const d = new Date(selectedDate);
    if (currentView === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    changeDate(d);
  }, [selectedDate, changeDate, currentView]);

  const handleNextDay = React.useCallback(() => {
    const d = new Date(selectedDate);
    if (currentView === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    changeDate(d);
  }, [selectedDate, changeDate, currentView]);

  const handleViewChange = React.useCallback((view: CalendarView) => {
    dispatch(setCurrentView(view));
  }, [dispatch]);

  const handleAddPost = React.useCallback((date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    window.location.href = `/create-post?date=${yyyy}-${mm}-${dd}`;
  }, []);

  const handleEdit = React.useCallback((post: Draft) => {
    setPreviewPost(post);
  }, []);

  const previewData = React.useMemo(() => {
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
  }, [previewPost]);

  const sortedPosts = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = new Date((a as any).scheduled_time || a.updated_at || a.created_at).getTime();
      const bTime = new Date((b as any).scheduled_time || b.updated_at || b.created_at).getTime();
      return aTime - bTime;
    });
  }, [items]);

  const mobileWeekPosts = React.useMemo(() => {
    const dayPosts = weekItems[selectedDateStr] || [];
    return [...dayPosts].sort((a, b) => {
      const aTime = new Date((a as any).scheduled_time || a.updated_at || a.created_at).getTime();
      const bTime = new Date((b as any).scheduled_time || b.updated_at || b.created_at).getTime();
      return aTime - bTime;
    });
  }, [weekItems, selectedDateStr]);

  const isTodaySelected = React.useMemo(() => {
    const now = new Date();
    return isSameDay(selectedDate, now);
  }, [selectedDate]);

  const mobileWeekDayTitle = React.useMemo(() => {
    return formatDayTitle(selectedDate);
  }, [selectedDate]);

  const combinedPostCounts = React.useMemo(() => {
    const combined: Record<string, number> = { ...monthPostCounts };
    for (const [key, posts] of Object.entries(weekItems)) {
      combined[key] = posts.length;
    }
    return combined;
  }, [monthPostCounts, weekItems]);

  return (
    <div className={`${styles.page} ${currentView === 'week' ? styles.pageWeek : ''}`}>
      <div className={styles.container}>
        <CalendarHeader
          selectedDate={selectedDate}
          currentView={currentView}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onViewChange={handleViewChange}
          onSettingsClick={() => setShowMobileCalendar(true)}
        />

        <div className={`${styles.mainContent} ${currentView === 'week' ? styles.mainContentWeek : ''}`}>
          {currentView === 'week' ? (
            <>
              <WeeklyCalendarView
                weekItems={weekItems}
                selectedDate={selectedDate}
                isLoading={isLoading}
                onEdit={handleEdit}
                onAddPost={handleAddPost}
              />
              <WeeklySidebar
                selectedDate={selectedDate}
                weekItems={weekItems}
                postCounts={combinedPostCounts}
                onMonthChange={setCountsMonthAnchor}
                onDateChange={changeDate}
                onEdit={handleEdit}
              />
            </>
          ) : (
            <>
              <div className={styles.postsColumn}>
                <CalendarList
                  posts={sortedPosts}
                  isLoading={isLoading}
                  onEdit={handleEdit}
                />
              </div>

              <CalendarSidebar
                selectedDate={selectedDate}
                onDateChange={changeDate}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.bottomGradient} />

      {showMobileCalendar && (
        <div
          className={styles.mobileCalendarPopup}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMobileCalendar(false);
          }}
        >
          <div className={styles.mobileCalendarContent}>
            <DatePicker
              value={selectedDate}
              onChange={changeDate}
              onMonthChange={setCountsMonthAnchor}
              locale="ru"
              minDate={null}
              highlightWeek={currentView === 'week'}
              postCounts={currentView === 'week' ? combinedPostCounts : undefined}
            />

            {currentView === 'week' && (
              mobileWeekPosts.length === 0 ? (
                isTodaySelected ? (
                  <div className={styles.mobileTodayEmptyState}>
                    <div className={styles.mobileTodayEmptyInner}>
                      <p className={styles.mobileTodayEmptyText}>На сегодня ничего не запланировано</p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.mobileEmptyState}>
                    <div className={styles.mobileDayTitle}>{mobileWeekDayTitle}</div>
                    <div className={styles.mobileEmptyTextBlock}>
                      <p className={styles.mobileEmptyTitle}>Ничего не запланировано</p>
                      <p className={styles.mobileEmptySubtitle}>
                        Создайте публикацию — она появится в календаре и в списке этого дня
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className={styles.mobilePostsSection}>
                  <div className={styles.mobileDayTitle}>{mobileWeekDayTitle}</div>
                  <div className={styles.mobilePostsList}>
                    <div className={styles.mobilePostsInner}>
                      {mobileWeekPosts.map((post) => {
                        const time = formatTime(
                          post.status === 'scheduled'
                            ? ((post as any).scheduled_time || post.created_at)
                            : ((post as any).published_at || post.updated_at || post.created_at)
                        );
                        const preview = getPreviewText(post);
                        return (
                          <div
                            key={post.id}
                            className={styles.mobilePostRow}
                            onClick={() => {
                              setShowMobileCalendar(false);
                              setPreviewPost(post);
                            }}
                          >
                            <span className={styles.mobilePostTime}>{time}</span>
                            <span className={styles.mobilePostPreview}>{preview || '(без текста)'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

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
