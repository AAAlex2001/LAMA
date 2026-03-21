'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import Loader from '@/components/loader';
import { CalendarDocPostIcon, CalendarDraftIcon, CalendarRepeatIcon, CalendarBotMessageIcon } from '@/components/icons';
import {
  formatDayTitle,
  formatTime,
  getPreviewText,
  getSourceDate,
  formatDateOnly,
  buildCreatePostUrl,
  hasRepeat,
  isBeforeToday,
} from '../utils/calendar-helpers';
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

  const scrollElRef = React.useRef<HTMLDivElement | null>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const loadingRef = React.useRef(isDayLoading);
  loadingRef.current = isDayLoading;
  const hasMoreRef = React.useRef(hasDayMore);
  hasMoreRef.current = hasDayMore;
  const onLoadRef = React.useRef(onLoadMoreDay);
  onLoadRef.current = onLoadMoreDay;
  const dayKeyRef = React.useRef(dateKey);
  dayKeyRef.current = dateKey;

  const checkNeedMore = React.useCallback(() => {
    const el = scrollElRef.current;
    if (!el || loadingRef.current || !hasMoreRef.current) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      onLoadRef.current(dayKeyRef.current);
    }
  }, []);

  const scrollRootRef = React.useCallback((node: HTMLDivElement | null) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    scrollElRef.current = node;
    if (!node) return;
    node.addEventListener('scroll', checkNeedMore, { passive: true });
    cleanupRef.current = () => node.removeEventListener('scroll', checkNeedMore);
    requestAnimationFrame(checkNeedMore);
  }, [checkNeedMore]);

  React.useEffect(() => {
    if (!isDayLoading && hasDayMore) {
      requestAnimationFrame(checkNeedMore);
    }
  }, [isDayLoading, hasDayMore, checkNeedMore]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.dayTitle}>{dayTitle}</div>

      {!isPast && (
        <div className={styles.createBtnWrapper}>
          <Button
            text="Создать публикацию"
            showArrow={false}
            active
            fullWidth
            className={styles.createBtn}
            onClick={() => router.push(buildCreatePostUrl(sidebarDate))}
          />
        </div>
      )}

      <div className={styles.postsSection}>
        <div className={styles.postsList} ref={scrollRootRef}>
          <div className={styles.postsInner}>
            {isDayLoading && posts.length === 0 ? (
              <div className={styles.dayLoader}>
                <Loader size={20} color="blue" />
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyDay}>Нет публикаций</div>
            ) : (
              posts.map((post) => {
                const time = formatTime(getSourceDate(post));
                const preview = getPreviewText(post);

                return (
                  <div
                    key={post.id}
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
                  </div>
                );
              })
            )}

            {isDayLoading && posts.length > 0 && (
              <div className={styles.dayLoader}>
                <Loader size={16} color="blue" />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
