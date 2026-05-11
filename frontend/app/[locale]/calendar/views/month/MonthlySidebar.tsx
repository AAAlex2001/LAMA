'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/new-button';
import type { Draft } from '@/types/post';
import Loader from '@/components/loader';
import { CalendarDocPostIcon, CalendarDraftIcon, CalendarRepeatIcon, CalendarBotMessageIcon } from '@/components/icons';
import { useInView } from '@/hooks/useInView';
import {
  formatDayTitle,
  formatTime,
  getPreviewText,
  getSourceDate,
  formatDateOnly,
  buildCreatePostUrl,
  hasRepeat,
  isBeforeToday,
} from '../../utils/calendar-helpers';
import styles from './monthly-sidebar.module.scss';

interface MonthlySidebarProps {
  sidebarDate: Date;
  weekItems: Record<string, Draft[]>;
  dayLoadingMap: Record<string, boolean>;
  dayHasMoreMap: Record<string, boolean>;
  onLoadMoreDay: (dateKey: string) => void;
  onEdit: (post: Draft) => void;
}

export default function MonthlySidebar({
  sidebarDate,
  weekItems,
  dayLoadingMap,
  dayHasMoreMap,
  onLoadMoreDay,
  onEdit,
}: MonthlySidebarProps) {
  const router = useRouter();

  const dateKey = formatDateOnly(sidebarDate);
  const dayTitle = formatDayTitle(sidebarDate);
  const posts = weekItems[dateKey] || [];
  const isDayLoading = !!dayLoadingMap[dateKey];
  const hasDayMore = !!dayHasMoreMap[dateKey];
  const isPast = isBeforeToday(sidebarDate);

  const [postsListEl, setPostsListEl] = React.useState<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1439px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const loadingRef = React.useRef(isDayLoading);
  loadingRef.current = isDayLoading;
  const hasMoreRef = React.useRef(hasDayMore);
  hasMoreRef.current = hasDayMore;
  const onLoadRef = React.useRef(onLoadMoreDay);
  onLoadRef.current = onLoadMoreDay;
  const dayKeyRef = React.useRef(dateKey);
  dayKeyRef.current = dateKey;

  const { ref: sentinelRef } = useInView({
    root: isMobile ? null : postsListEl,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
    skip: !hasDayMore || isDayLoading || (!isMobile && !postsListEl),
    onChange(inView) {
      if (inView && hasMoreRef.current && !loadingRef.current) {
        onLoadRef.current(dayKeyRef.current);
      }
    },
  });

  return (
    <div className={styles.sidebar}>
      <div className={styles.dayTitle}>{dayTitle}</div>

      {!isPast && (
        <div className={styles.createBtnWrapper}>
          <Button
            intent="gradient"
            style={{ width: '100%' }}
            className={styles.createBtn}
            onClick={() => router.push(buildCreatePostUrl(sidebarDate))}
          >
            Создать публикацию
          </Button>
        </div>
      )}

      <div className={styles.postsSection}>
        <div className={styles.postsList} ref={setPostsListEl}>
          <div className={styles.postsInner}>
            {isDayLoading && posts.length === 0 ? (
              <div className={styles.dayLoader}>
                <Loader size={20} color="blue" />
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyDay}>Нет публикаций</div>
            ) : (
              posts.map((post, index) => {
                const time = formatTime(getSourceDate(post));
                const preview = getPreviewText(post);

                const isSeries = (post.series_count ?? 0) > 1;

                return (
                  <div
                    key={`${post.id}-${getSourceDate(post)}-${index}`}
                    className={styles.postRow}
                    onClick={() => onEdit(post)}
                  >
                    <div className={styles.postIcon}>
                      {post.is_bot_message ? (
                        <CalendarBotMessageIcon width={14} height={14} />
                      ) : post.status === 'draft' ? (
                        <CalendarDraftIcon width={14} height={14} />
                      ) : (
                        <CalendarDocPostIcon width={16} height={16} />
                      )}
                    </div>
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
                    {hasRepeat(post) && <CalendarRepeatIcon width={14} height={14} />}
                    {isSeries && <span className={styles.seriesBadge}>Серия · {post.series_count}</span>}
                  </div>
                );
              })
            )}

            {isDayLoading && posts.length > 0 && (
              <div className={styles.dayLoader}>
                <Loader size={16} color="blue" />
              </div>
            )}

            {hasDayMore && !isDayLoading && (
              <div ref={sentinelRef as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
