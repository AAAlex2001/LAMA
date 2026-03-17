'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/button/button';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import Loader from '@/components/loader';
import { CalendarDocPostIcon, CalendarDraftIcon } from '@/components/icons';
import { useInView } from '../store/useInView';
import {
  formatDayTitle,
  formatTime,
  getPreviewText,
  getSourceDate,
  formatDateOnly,
  buildCreatePostUrl,
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

  const { ref: sentinelRef, inView } = useInView({ threshold: 0, skip: isDayLoading || !hasDayMore });

  React.useEffect(() => {
    if (inView && hasDayMore && !isDayLoading) {
      onLoadMoreDay(dateKey);
    }
  }, [inView, hasDayMore, isDayLoading, onLoadMoreDay, dateKey]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.dayTitle}>{dayTitle}</div>

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

      <div className={styles.postsSection}>
        <div className={styles.postsList}>
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
                      {post.status === 'draft' ? (
                        <CalendarDraftIcon width={14} height={14} />
                      ) : (
                        <CalendarDocPostIcon width={16} height={16} />
                      )}
                    </div>
                    <span className={styles.postTime}>{time}</span>
                    <span className={styles.postPreview}>
                      {preview || '(без текста)'}
                    </span>
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
